/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ChatClient } from "@nestjs-ai/client-chat";
import type { MediaContent, TokenCountEstimator } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  MessageType,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompactionRequest } from "../compaction-request.js";
import { RecursiveSummarizationCompactionStrategy } from "../recursive-summarization-compaction-strategy.js";
import { SessionEvent } from "../../session-event.js";
import { Session } from "../../session.js";

/**
 * Tests for {@link RecursiveSummarizationCompactionStrategy}.
 *
 * The LLM call is mocked so tests run without a real AI model.
 */
describe("RecursiveSummarizationCompactionStrategy", () => {
  const SESSION_ID = "test-session";

  const SUMMARY_TEXT = "Summary: the user asked about Java and got answers.";

  let chatClient: ChatClient;
  let promptSpy: ReturnType<typeof vi.fn>;

  /**
   * Builds a fluent mock: chatClient → prompt() → system() → user() → call() → content().
   */
  function mockChatClient(content: string | null): void {
    const callResponse = { content: () => Promise.resolve(content) };
    const requestSpec: Record<string, unknown> = {};
    requestSpec.system = () => requestSpec;
    requestSpec.user = () => requestSpec;
    requestSpec.call = () => callResponse;
    promptSpy = vi.fn(() => requestSpec);
    chatClient = { prompt: promptSpy } as unknown as ChatClient;
  }

  beforeEach(() => {
    mockChatClient(SUMMARY_TEXT);
  });

  it("no compaction when under limit", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 10,
    });

    const events = buildRealEvents(5);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.compactedEvents).toHaveLength(5);
    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("no compaction when at exact limit", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 5,
    });

    const events = buildRealEvents(5);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.compactedEvents).toHaveLength(5);
    expect(result.eventsRemoved()).toBe(0);
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("compaction produces synthetic summary plus active window", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 3,
      overlapSize: 0,
    });

    const events = buildRealEvents(6);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    // 2 synthetic summary turn events (USER shadow + ASSISTANT summary) + 3 active
    // window events
    expect(result.compactedEvents).toHaveLength(5);
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[0].messageType).toBe(MessageType.USER);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].messageType).toBe(MessageType.ASSISTANT);
    expect(result.compactedEvents[1].message.text).toBe(SUMMARY_TEXT);
    // last 3 real events are preserved intact
    expect(result.compactedEvents[2].message.text).toBe("msg-4");
    expect(result.compactedEvents[3].message.text).toBe("msg-5");
    expect(result.compactedEvents[4].message.text).toBe("msg-6");
  });

  it("archived events contains older events", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const events = buildRealEvents(5);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.archivedEvents).toHaveLength(3);
    expect(result.archivedEvents.map((e) => e.message.text)).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
    ]);
    expect(result.eventsRemoved()).toBe(3);
  });

  it("prior synthetic summary is replaced but not counted as archived", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const events: SessionEvent[] = [];
    // Prior synthetic summary from a previous compaction pass
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of(
          RecursiveSummarizationCompactionStrategy.DEFAULT_SUMMARY_SHADOW_PROMPT,
        ),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "recursive-summarization",
        },
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("Prior summary text"),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "recursive-summarization",
        },
      }),
    );
    events.push(...buildRealEvents(4)); // msg-1 … msg-4

    const context = contextFor(events);
    const result = await strategy.compact(context);

    // archivedEvents contains only the real events that were summarized;
    // prior synthetic events are implicitly replaced by the new summaryTurn and are
    // NOT included in archivedEvents (consistent with other strategies).
    expect(result.archivedEvents.every((e) => !e.isSynthetic())).toBe(true);
    expect(result.archivedEvents).toHaveLength(2); // msg-1 and msg-2

    // New synthetic summary turn (USER shadow + ASSISTANT summary) is first in
    // compacted, followed by the last 2 real events.
    expect(result.compactedEvents).toHaveLength(4);
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[0].messageType).toBe(MessageType.USER);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].message.text).toBe(SUMMARY_TEXT);
  });

  it("custom shadow prompt appears in summary turn", async () => {
    const customShadow = "Bitte fasse unser bisheriges Gespräch zusammen.";
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      shadowPrompt: customShadow,
    });

    const events = buildRealEvents(4);
    const result = await strategy.compact(contextFor(events));

    const shadowEvent = result.compactedEvents[0];
    expect(shadowEvent.isSynthetic()).toBe(true);
    expect(shadowEvent.messageType).toBe(MessageType.USER);
    expect(shadowEvent.message.text).toBe(customShadow);
  });

  it("summary event has correct compaction source", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 1,
      overlapSize: 0,
    });

    const events = buildRealEvents(3);
    const result = await strategy.compact(contextFor(events));

    // Both events in the summary turn carry the compactionSource metadata
    const shadowPrompt = result.compactedEvents[0];
    const summaryAssistant = result.compactedEvents[1];
    expect(shadowPrompt.isSynthetic()).toBe(true);
    expect(shadowPrompt.metadata).toHaveProperty(
      SessionEvent.METADATA_COMPACTION_SOURCE,
      "recursive-summarization",
    );
    expect(summaryAssistant.isSynthetic()).toBe(true);
    expect(summaryAssistant.metadata).toHaveProperty(
      SessionEvent.METADATA_COMPACTION_SOURCE,
      "recursive-summarization",
    );
  });

  it("summary turn is user assistant pair with shadow prompt", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const events = buildRealEvents(4);
    const result = await strategy.compact(contextFor(events));

    // First event: synthetic USER shadow prompt
    const shadow = result.compactedEvents[0];
    expect(shadow.isSynthetic()).toBe(true);
    expect(shadow.messageType).toBe(MessageType.USER);
    expect(shadow.message.text).toBe(
      RecursiveSummarizationCompactionStrategy.DEFAULT_SUMMARY_SHADOW_PROMPT,
    );

    // Second event: synthetic ASSISTANT summary
    const summaryMsg = result.compactedEvents[1];
    expect(summaryMsg.isSynthetic()).toBe(true);
    expect(summaryMsg.messageType).toBe(MessageType.ASSISTANT);
    expect(summaryMsg.message.text).toBe(SUMMARY_TEXT);
  });

  it("snaps to turn boundary when raw cut lands on assistant event", async () => {
    // maxEventsToKeep = 2
    // Session: [u1, a1, u2, a2, u3, a3] (3 turns, 6 events)
    // Raw cutIndex = 6 - 2 = 4 → real[4] = u3 (USER — already a turn start, no snap)
    //
    // Test the split case: multi-step turn where assistant follows assistant.
    // Session: [u1, a1, u2, a2a, a2b, u3, a3] (3 turns, 7 events)
    // maxEventsToKeep = 3 → rawCutIndex = 7 - 3 = 4 → real[4] = a2b (ASSISTANT)
    // Snap: real[4]=a2b(ASSISTANT) → real[5]=u3(USER) → cutIndex=5
    // activeWindow = [u3, a3], toArchive = [u1, a1, u2, a2a, a2b]
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 3,
      overlapSize: 0,
    });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("u2"),
      assistantEvent("a2a"), // multi-step
      assistantEvent("a2b"), // raw cut lands here
      userEvent("u3"),
      assistantEvent("a3"),
    ];

    const result = await strategy.compact(contextFor(events));

    // Summary turn: [0]=synthetic USER shadow, [1]=synthetic ASSISTANT summary
    // Active window starts at index 2: must start at u3, not at a2b
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[0].messageType).toBe(MessageType.USER);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].messageType).toBe(MessageType.ASSISTANT);
    expect(result.compactedEvents[2].message.text).toBe("u3");
    expect(result.compactedEvents[3].message.text).toBe("a3");

    // a2b should be archived, not kept
    expect(result.archivedEvents.map((e) => e.message.text)).toContain("a2b");
  });

  it("null events throws exception", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
    });

    await expect(
      strategy.compact(null as unknown as CompactionRequest),
    ).rejects.toThrow("context must not be null");
  });

  it("null chat client throws exception", () => {
    expect(
      () =>
        new RecursiveSummarizationCompactionStrategy({
          chatClient: null as unknown as ChatClient,
        }),
    ).toThrow("chatClient must not be null");
  });

  // --- LLM failure handling ---

  it("llm returning null summary skips compaction and returns unchanged events", async () => {
    mockChatClient(null);

    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const events = buildRealEvents(5);
    const result = await strategy.compact(contextFor(events));

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(result.compactedEvents).toHaveLength(5);
  });

  it("llm returning blank summary skips compaction and returns unchanged events", async () => {
    mockChatClient("   ");

    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const events = buildRealEvents(5);
    const result = await strategy.compact(contextFor(events));

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
  });

  it("on summarization failure callback invoked when llm returns null", async () => {
    mockChatClient(null);

    let captured: CompactionRequest | null = null;
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      onSummarizationFailure: (request) => {
        captured = request;
      },
    });

    const events = buildRealEvents(5);
    const context = contextFor(events);
    await strategy.compact(context);

    expect(captured).not.toBeNull();
    expect((captured as unknown as CompactionRequest).session.id).toBe(
      SESSION_ID,
    );
  });

  it("on summarization failure callback not invoked on success", async () => {
    // chatClient already wired to return SUMMARY_TEXT in @BeforeEach

    let captured: CompactionRequest | null = null;
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      onSummarizationFailure: (request) => {
        captured = request;
      },
    });

    const events = buildRealEvents(5);
    await strategy.compact(contextFor(events));

    expect(captured).toBeNull();
  });

  // --- overlapSize / maxEventsToKeep cross-validation ---

  it("overlap size equal to max events to keep is rejected", () => {
    expect(
      () =>
        new RecursiveSummarizationCompactionStrategy({
          chatClient,
          maxEventsToKeep: 5,
          overlapSize: 5,
        }),
    ).toThrow("overlapSize must be less than maxEventsToKeep");
  });

  it("overlap size greater than max events to keep is rejected", () => {
    expect(
      () =>
        new RecursiveSummarizationCompactionStrategy({
          chatClient,
          maxEventsToKeep: 3,
          overlapSize: 4,
        }),
    ).toThrow("overlapSize");
  });

  it("overlap size one less than max events to keep is accepted", () => {
    // Boundary case: overlapSize = maxEventsToKeep - 1 is valid (though unusual)
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 5,
      overlapSize: 4,
    });
    expect(strategy).not.toBeNull();
  });

  // --- tool call / tool response formatting ---

  it("tool call names and arguments appear in formatted output", async () => {
    const estimatedTexts: string[] = [];
    const capturingEstimatorInstance = capturingEstimator(estimatedTexts);

    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      tokenCountEstimator: capturingEstimatorInstance,
    });

    await strategy.compact(contextFor(buildToolCallSession()));

    // The capturing estimator receives the output of formatEvent() for each archived
    // event, so tool call names and arguments must appear in at least one entry.
    expect(estimatedTexts.some((t) => t.includes("get_weather"))).toBe(true);
    expect(estimatedTexts.some((t) => t.includes("Paris"))).toBe(true);
  });

  it("tool response content appears in formatted output", async () => {
    const estimatedTexts: string[] = [];

    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      tokenCountEstimator: capturingEstimator(estimatedTexts),
    });

    await strategy.compact(contextFor(buildToolCallSession()));

    expect(estimatedTexts.some((t) => t.includes("22C"))).toBe(true);
  });

  it("tokens estimated saved is positive when archiving tool events", async () => {
    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
    });

    const result = await strategy.compact(contextFor(buildToolCallSession()));

    expect(result.tokensEstimatedSaved).toBeGreaterThan(0);
  });

  it("custom event formatter is applied", async () => {
    const estimatedTexts: string[] = [];

    const strategy = new RecursiveSummarizationCompactionStrategy({
      chatClient,
      maxEventsToKeep: 2,
      overlapSize: 0,
      tokenCountEstimator: capturingEstimator(estimatedTexts),
      eventFormatter: (e) => `CUSTOM[${e.messageType}]`,
    });

    await strategy.compact(contextFor(buildRealEvents(4)));

    expect(estimatedTexts.length).toBeGreaterThan(0);
    expect(estimatedTexts.every((t) => t.startsWith("CUSTOM["))).toBe(true);
  });

  // --- helpers ---

  function userEvent(text: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of(text),
    });
  }

  function assistantEvent(text: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(text),
    });
  }

  /**
   * Turn 1 (archived when maxEventsToKeep=2): user question + assistant tool call +
   * tool response. Turn 2 (active window): plain user+assistant exchange.
   */
  function buildToolCallSession(): SessionEvent[] {
    return [
      userEvent("What's the weather?"),
      new SessionEvent({
        sessionId: SESSION_ID,
        message: new AssistantMessage({
          toolCalls: [
            {
              id: "call-1",
              type: "function",
              name: "get_weather",
              arguments: '{"location":"Paris"}',
            },
          ],
        }),
      }),
      new SessionEvent({
        sessionId: SESSION_ID,
        message: new ToolResponseMessage({
          responses: [
            {
              id: "call-1",
              name: "get_weather",
              responseData: '{"temp":"22C"}',
            },
          ],
        }),
      }),
      userEvent("Thanks"),
      assistantEvent("You're welcome"),
    ];
  }

  function capturingEstimator(sink: string[]): TokenCountEstimator {
    return {
      estimate(
        input: string | null | MediaContent | Iterable<MediaContent>,
      ): number {
        if (typeof input === "string") {
          sink.push(input);
          return input.length;
        }
        return 0;
      },
    };
  }

  function buildRealEvents(count: number): SessionEvent[] {
    const events: SessionEvent[] = [];
    for (let i = 1; i <= count; i++) {
      events.push(
        new SessionEvent({
          sessionId: SESSION_ID,
          message: UserMessage.of(`msg-${i}`),
        }),
      );
    }
    return events;
  }

  function contextFor(events: SessionEvent[]): CompactionRequest {
    const session = new Session({ id: SESSION_ID, userId: "test-user" });
    return CompactionRequest.of(session, [...events]);
  }
});
