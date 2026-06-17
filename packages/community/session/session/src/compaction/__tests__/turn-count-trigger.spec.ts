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

import { AssistantMessage, UserMessage } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { CompactionRequest } from "../compaction-request.js";
import { TurnCountTrigger } from "../turn-count-trigger.js";
import { SessionEvent } from "../../session-event.js";
import { Session } from "../../session.js";

/**
 * Tests for {@link TurnCountTrigger}.
 */
describe("TurnCountTrigger", () => {
  const SESSION_ID = "test-session";

  it("does not fire when turns under threshold", () => {
    const trigger = new TurnCountTrigger(5);
    // 3 turns (3 user messages)
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
    );

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("does not fire when turns at exact threshold", () => {
    const trigger = new TurnCountTrigger(3);
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
    );

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("fires when turns exceed threshold", () => {
    const trigger = new TurnCountTrigger(3);
    // 4 turns — exceeds threshold of 3
    const request = requestWith(
      turn("q1", "a1"),
      turn("q2", "a2"),
      turn("q3", "a3"),
      turn("q4", "a4"),
    );

    expect(trigger.shouldCompact(request)).toBe(true);
  });

  it("does not fire on empty session", () => {
    const trigger = new TurnCountTrigger(3);
    const request = requestWith();

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("synthetic events are not counted as turns", () => {
    const trigger = new TurnCountTrigger(2);

    const events: SessionEvent[] = [];
    // 5 synthetic summary turns (10 events total) — none should count as real turns
    for (let i = 0; i < 5; i++) {
      events.push(
        new SessionEvent({
          sessionId: SESSION_ID,
          message: UserMessage.of("Summarize the conversation we had so far."),
          metadata: {
            [SessionEvent.METADATA_SYNTHETIC]: true,
            [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
          },
        }),
      );
      events.push(
        new SessionEvent({
          sessionId: SESSION_ID,
          message: AssistantMessage.of(`summary-${i}`),
          metadata: {
            [SessionEvent.METADATA_SYNTHETIC]: true,
            [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
          },
        }),
      );
    }
    // 2 real turns — exactly at threshold
    events.push(...turn("q1", "a1"));
    events.push(...turn("q2", "a2"));

    const request = requestWith(events);

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("max turns zero is rejected", () => {
    expect(() => new TurnCountTrigger(0)).toThrow(
      "maxTurns must be greater than 0",
    );
  });

  it("max turns negative is rejected", () => {
    expect(() => new TurnCountTrigger(-1)).toThrow(
      "maxTurns must be greater than 0",
    );
  });

  it("get max turns returns configured value", () => {
    const trigger = new TurnCountTrigger(7);
    expect(trigger.maxTurns).toBe(7);
  });

  // --- helpers ---

  function turn(userText: string, assistantText: string): SessionEvent[] {
    return [
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of(userText),
      }),
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of(assistantText),
      }),
    ];
  }

  function requestWith(...turns: SessionEvent[][]): CompactionRequest {
    const all = turns.flat();
    const session = new Session({ id: SESSION_ID, userId: "test-user" });
    return CompactionRequest.of(session, [...all]);
  }
});
