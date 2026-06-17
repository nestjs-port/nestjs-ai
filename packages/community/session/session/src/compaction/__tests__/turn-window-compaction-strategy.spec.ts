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

import {
  AssistantMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { CompactionRequest } from "../compaction-request.js";
import { TurnWindowCompactionStrategy } from "../turn-window-compaction-strategy.js";
import { SessionEvent } from "../../session-event.js";
import { Session } from "../../session.js";

/**
 * Tests for {@link TurnWindowCompactionStrategy}.
 */
describe("TurnWindowCompactionStrategy", () => {
  const SESSION_ID = "test-session";

  it("no op when turns under limit", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 5 });
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
    );

    const result = await strategy.compact(request);

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(result.compactedEvents).toHaveLength(6); // 3 turns × 2 events each
  });

  it("no op when turns at exact limit", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 3 });
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
    );

    const result = await strategy.compact(request);

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
  });

  it("archives oldest turns when over limit", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 2 });
    // 4 turns, keep last 2 → archive first 2
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
      turn("q4", "a4"),
    );

    const result = await strategy.compact(request);

    // kept: turns 3 and 4 (4 events)
    expect(result.compactedEvents).toHaveLength(4);
    expect(result.archivedEvents).toHaveLength(4); // 2 archived turns × 2 events
    expect(result.eventsRemoved()).toBe(4);

    // First kept event must be the user message of turn 3
    expect(result.compactedEvents[0].message.text).toBe("q3");
    expect(result.compactedEvents[1].message.text).toBe("a3");
    expect(result.compactedEvents[2].message.text).toBe("q4");
    expect(result.compactedEvents[3].message.text).toBe("a4");
  });

  it("synthetic events are placed first and preserved", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 2 });

    const events: SessionEvent[] = [];
    // One summary turn = 2 synthetic events (USER shadow + ASSISTANT summary)
    events.push(syntheticUser("Summarize the conversation we had so far."));
    events.push(syntheticAssistant("prior summary"));
    events.push(...turn("q1", "a1"));
    events.push(...turn("q2", "a2"));
    events.push(...turn("q3", "a3"));
    events.push(...turn("q4", "a4"));

    const result = await strategy.compact(requestWith(events));

    // Result: [s_user, s_assistant] + [turn3] + [turn4]
    expect(result.compactedEvents).toHaveLength(6); // 2 synthetic + 2 turns × 2
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].message.text).toBe("prior summary");
    expect(result.compactedEvents[2].message.text).toBe("q3");
  });

  it("multiple synthetic events all preserved", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 1 });

    const events: SessionEvent[] = [];
    // Two prior summary turns = 4 synthetic events
    events.push(syntheticUser("Summarize the conversation we had so far."));
    events.push(syntheticAssistant("summary-1"));
    events.push(syntheticUser("Summarize the conversation we had so far."));
    events.push(syntheticAssistant("summary-2"));
    events.push(...turn("q1", "a1"));
    events.push(...turn("q2", "a2"));

    const result = await strategy.compact(requestWith(events));

    // Result: [s1_user, s1_assistant, s2_user, s2_assistant] + [turn2]
    expect(result.compactedEvents).toHaveLength(6);
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[2].isSynthetic()).toBe(true);
    expect(result.compactedEvents[3].isSynthetic()).toBe(true);
    expect(result.compactedEvents[4].message.text).toBe("q2");
  });

  it("preamble events before first user message are preserved", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 1 });

    const events: SessionEvent[] = [];
    // preamble: assistant event before any user message (pre-seeded tool state)
    events.push(assistantEvent("system boot info"));
    events.push(...turn("q1", "a1"));
    events.push(...turn("q2", "a2"));

    const result = await strategy.compact(requestWith(events));

    // Result: [preamble] + [turn2]
    expect(result.compactedEvents).toHaveLength(3); // 1 preamble + 2 events in turn2
    expect(result.compactedEvents[0].message.text).toBe("system boot info");
    expect(result.compactedEvents[1].message.text).toBe("q2");
  });

  it("never splits a turn in half", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 2 });

    // Turn 1: user + assistant + assistant (multi-step)
    const turn1 = [
      userEvent("u1"),
      assistantEvent("step1"),
      assistantEvent("step2"),
    ];

    // Turn 2: user + assistant
    const turn2 = turn("u2", "a2");

    // Turn 3: user + assistant
    const turn3 = turn("u3", "a3");

    const request = requestWith(turn1, turn2, turn3);
    const result = await strategy.compact(request);

    // Keep last 2 turns (turn2, turn3). Turn1 (3 events) is archived.
    expect(result.archivedEvents).toHaveLength(3);
    expect(result.compactedEvents).toHaveLength(4); // turn2 + turn3

    // Verify turn2 starts the kept section
    expect(result.compactedEvents[0].message.text).toBe("u2");
  });

  it("empty session returns unchanged", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 3 });
    const request = requestWith([]);

    const result = await strategy.compact(request);

    expect(result.compactedEvents).toHaveLength(0);
    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
  });

  it("max turns zero is rejected", () => {
    expect(() => new TurnWindowCompactionStrategy({ maxTurns: 0 })).toThrow(
      "maxTurns must be greater than 0",
    );
  });

  it("null request is rejected", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 3 });
    await expect(
      strategy.compact(null as unknown as CompactionRequest),
    ).rejects.toThrow("request must not be null");
  });

  it("default max turns is applied", () => {
    const strategy = new TurnWindowCompactionStrategy();
    expect(strategy.maxTurns).toBe(
      TurnWindowCompactionStrategy.DEFAULT_MAX_TURNS,
    );
  });

  it("tokens removed approximation", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 1 });
    // Turn 1 archived: "q1" + "a1" — token count estimated via
    // JTokkitTokenCountEstimator
    const request = requestWith(turn("q1", "a1"), turn("q2", "a2"));

    const result = await strategy.compact(request);

    expect(result.tokensEstimatedSaved).toBeGreaterThanOrEqual(0);
  });

  it("tokens estimated saved is positive when archiving turn with tool events", async () => {
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 1 });

    // Turn 1 (archived): user question + assistant tool call + tool response
    const toolTurn = [
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
    ];

    const result = await strategy.compact(
      requestWith(toolTurn, turn("Thanks", "You're welcome")),
    );

    expect(result.archivedEvents.length).toBeGreaterThan(0);
    expect(result.tokensEstimatedSaved).toBeGreaterThan(0);
  });

  // --- branch-awareness ---

  it("branch user events do not inflate turn count", async () => {
    // Root turn 1: [u1, a1, sub-q (branch), sub-a (branch)] — sub-agent exchange inside turn 1
    // Root turn 2: [u2, a2]
    // Root turn 3: [u3, a3]
    // Without branch-awareness the branch USER event would be counted as a 4th turn start,
    // causing premature archiving.
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 2 });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("sub-q", "sub"),
      assistantEvent("sub-a", "sub"),
      userEvent("u2"),
      assistantEvent("a2"),
      userEvent("u3"),
      assistantEvent("a3"),
    ];

    const result = await strategy.compact(requestWith(events));

    // Exactly 3 root turns; archive root turn 1 (4 events incl. branch), keep turns 2 and 3
    expect(result.archivedEvents).toHaveLength(4);
    expect(result.compactedEvents).toHaveLength(4);
    expect(result.compactedEvents[0].message.text).toBe("u2");
    expect(result.compactedEvents[2].message.text).toBe("u3");
  });

  it("preamble scan skips branch user events", async () => {
    // Branch events appear before the first root USER — they belong to the preamble.
    // maxTurns=1 → archive root turn 1, keep root turn 2.
    const strategy = new TurnWindowCompactionStrategy({ maxTurns: 1 });

    const events = [
      userEvent("sub-q", "sub"),
      assistantEvent("sub-a", "sub"),
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("u2"),
      assistantEvent("a2"),
    ];

    const result = await strategy.compact(requestWith(events));

    // Preamble [sub-q, sub-a] preserved; root turn 1 [u1, a1] archived; root turn 2 [u2, a2] kept
    expect(result.archivedEvents).toHaveLength(2);
    expect(result.archivedEvents[0].message.text).toBe("u1");
    expect(result.compactedEvents).toHaveLength(4); // [sub-q, sub-a, u2, a2]
    expect(result.compactedEvents[0].message.text).toBe("sub-q");
    expect(result.compactedEvents[2].message.text).toBe("u2");
  });

  // --- helpers ---

  function userEvent(text: string, branch: string | null = null): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of(text),
      branch,
    });
  }

  function assistantEvent(
    text: string,
    branch: string | null = null,
  ): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(text),
      branch,
    });
  }

  function syntheticUser(text: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of(text),
      metadata: {
        [SessionEvent.METADATA_SYNTHETIC]: true,
        [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
      },
    });
  }

  function syntheticAssistant(text: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(text),
      metadata: {
        [SessionEvent.METADATA_SYNTHETIC]: true,
        [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
      },
    });
  }

  function turn(userText: string, assistantText: string): SessionEvent[] {
    return [userEvent(userText), assistantEvent(assistantText)];
  }

  function requestWith(...turns: SessionEvent[][]): CompactionRequest {
    const all = turns.flat();
    const session = new Session({ id: SESSION_ID, userId: "test-user" });
    return CompactionRequest.of(session, [...all]);
  }
});
