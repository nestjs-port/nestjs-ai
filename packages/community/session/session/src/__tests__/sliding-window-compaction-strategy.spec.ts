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
  MessageType,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { CompactionRequest } from "../compaction/compaction-request.js";
import { SlidingWindowCompactionStrategy } from "../compaction/sliding-window-compaction-strategy.js";
import { SessionEvent } from "../session-event.js";
import { Session } from "../session.js";

/**
 * Tests for {@link SlidingWindowCompactionStrategy}.
 */
describe("SlidingWindowCompactionStrategy", () => {
  const SESSION_ID = "test-session";

  it("events under limit no compaction", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 5 });
    const events = buildRealEvents(3);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.compactedEvents).toHaveLength(3);
    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
  });

  it("events at exact limit no compaction", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 3 });
    const events = buildRealEvents(3);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.compactedEvents).toHaveLength(3);
    expect(result.eventsRemoved()).toBe(0);
  });

  it("events over limit keeps last max events", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 3 });
    const events = buildRealEvents(5);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.compactedEvents).toHaveLength(3);
    expect(result.archivedEvents).toHaveLength(2);
    expect(result.eventsRemoved()).toBe(2);

    expect(result.compactedEvents[0].message.text).toBe("msg-3");
    expect(result.compactedEvents[1].message.text).toBe("msg-4");
    expect(result.compactedEvents[2].message.text).toBe("msg-5");
  });

  it("synthetic events always preserved and placed first", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 3 });

    const events: SessionEvent[] = [];
    // One summary turn = 2 synthetic events (USER shadow + ASSISTANT summary)
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("Summarize the conversation we had so far."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "sliding-window",
        },
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("prior summary"),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "sliding-window",
        },
      }),
    );
    events.push(...buildRealEvents(4)); // msg-1 … msg-4

    const context = contextFor(events);
    const result = await strategy.compact(context);

    // maxEvents=3 controls the real-events window independently of synthetics.
    // 4 real events → keep last 3 (msg-2, msg-3, msg-4); 1 real archived.
    // Result: [s_user, s_assistant, msg-2, msg-3, msg-4] = 5 events total.
    expect(result.compactedEvents).toHaveLength(5);
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[0].messageType).toBe(MessageType.USER);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].message.text).toBe("prior summary");
    expect(result.compactedEvents[2].message.text).toBe("msg-2");
    expect(result.compactedEvents[3].message.text).toBe("msg-3");
    expect(result.compactedEvents[4].message.text).toBe("msg-4");
    expect(result.archivedEvents).toHaveLength(1);
    expect(result.archivedEvents[0].message.text).toBe("msg-1");
  });

  it("events removed count is correct", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 2 });
    const events = buildRealEvents(7);
    const context = contextFor(events);

    const result = await strategy.compact(context);

    expect(result.eventsRemoved()).toBe(5);
    expect(result.archivedEvents).toHaveLength(5);
    expect(result.compactedEvents).toHaveLength(2);
  });

  it("max events zero is rejected", () => {
    expect(() => new SlidingWindowCompactionStrategy({ maxEvents: 0 })).toThrow(
      "maxEvents must be greater than 0",
    );
  });

  it("null events is rejected", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 5 });
    await expect(
      strategy.compact(null as unknown as CompactionRequest),
    ).rejects.toThrow("context must not be null");
  });

  it("snaps to turn boundary when raw cut lands on assistant event", async () => {
    // maxEvents = 3 → slotsForReal = 3 (no synthetics)
    // Session: [u1, a1, u2, a2, u3, a3] (3 turns, 6 events)
    // Raw cutIndex = 6 - 3 = 3 → real[3] = a2 (ASSISTANT — not a turn start)
    // Snap forward: real[3]=a2(ASSISTANT) → real[4]=u3(USER) → cutIndex=4
    // Kept: [u3, a3], Archived: [u1, a1, u2, a2]
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 3 });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("u2"),
      assistantEvent("a2"),
      userEvent("u3"),
      assistantEvent("a3"),
    ];

    const result = await strategy.compact(contextFor(events));

    // Kept window must start at a USER event
    expect(result.compactedEvents.length).toBeGreaterThan(0);
    expect(result.compactedEvents[0].message.text).toBe("u3");
    expect(result.compactedEvents[1].message.text).toBe("a3");

    // Archived contains the first two turns intact
    expect(result.archivedEvents).toHaveLength(4);
  });

  it("kept window always starts at user message", async () => {
    // Any compacted result that is non-empty must begin with a USER event
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 2 });

    const events = [
      userEvent("q1"),
      assistantEvent("r1"),
      assistantEvent("r1b"), // multi-step turn
      userEvent("q2"),
      assistantEvent("r2"),
    ];

    const result = await strategy.compact(contextFor(events));

    const compacted = result.compactedEvents;
    const startsAtUserOrSynthetic =
      compacted.length === 0 ||
      compacted[0].isSynthetic() ||
      compacted[0].message instanceof UserMessage;
    expect(startsAtUserOrSynthetic).toBe(true);
  });

  it("tokens estimated saved is positive when archiving tool events", async () => {
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 2 });

    const events = [
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

    const result = await strategy.compact(contextFor(events));

    expect(result.archivedEvents.length).toBeGreaterThan(0);
    expect(result.tokensEstimatedSaved).toBeGreaterThan(0);
  });

  // --- branch-awareness ---

  it("branch events do not consume max events slots", async () => {
    // real=[u1, a1, sub-q(branch), sub-a(branch), u2, a2] → 4 root events, 2 branch
    // maxEvents=2 → archive 2 root events (u1, a1); kept window starts at u2.
    // Branch events between the archived and kept root turns are also archived because
    // they fall before the snap cut point.
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 2 });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("sub-q", "sub"),
      assistantEvent("sub-a", "sub"),
      userEvent("u2"),
      assistantEvent("a2"),
    ];

    const result = await strategy.compact(contextFor(events));

    expect(result.compactedEvents).toHaveLength(2);
    expect(result.compactedEvents[0].message.text).toBe("u2");
    expect(result.compactedEvents[1].message.text).toBe("a2");
    expect(result.archivedEvents).toHaveLength(4); // u1, a1, sub-q, sub-a
  });

  it("no compaction when root events within budget despite excess total events", async () => {
    // real=[u1, a1, sub-q(branch), sub-a(branch), u2, a2] — 6 total, 4 root events
    // maxEvents=4 → 4 root events <= 4 slots → no-op (branch events come for free)
    // Old behaviour (count all real events): 6 > 4 → would compact and start window
    // at branch USER u2-sub, which is semantically wrong.
    const strategy = new SlidingWindowCompactionStrategy({ maxEvents: 4 });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("sub-q", "sub"),
      assistantEvent("sub-a", "sub"),
      userEvent("u2"),
      assistantEvent("a2"),
    ];

    const result = await strategy.compact(contextFor(events));

    // All 6 events returned unchanged — no compaction needed
    expect(result.archivedEvents).toHaveLength(0);
    expect(result.compactedEvents).toHaveLength(6);
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
