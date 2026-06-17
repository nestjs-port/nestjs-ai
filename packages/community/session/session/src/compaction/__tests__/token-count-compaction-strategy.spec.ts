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

import type { MediaContent, TokenCountEstimator } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { CompactionRequest } from "../compaction-request.js";
import { TokenCountCompactionStrategy } from "../token-count-compaction-strategy.js";
import { SessionEvent } from "../../session-event.js";
import { Session } from "../../session.js";

/**
 * Tests for {@link TokenCountCompactionStrategy}.
 */
describe("TokenCountCompactionStrategy", () => {
  const SESSION_ID = "test-session";

  /**
   * Deterministic estimator: each character counts as one token.
   */
  const CHAR_ESTIMATOR: TokenCountEstimator = {
    estimate(
      input: string | null | MediaContent | Iterable<MediaContent>,
    ): number {
      return typeof input === "string" ? input.length : 0;
    },
  };

  it("no op when all events fit within budget", async () => {
    // budget = 100 tokens, events are tiny
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 100,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("hi", "hello"));

    const result = await strategy.compact(request);

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(result.compactedEvents).toHaveLength(2);
  });

  it("archives events exceeding budget", async () => {
    // CHAR_ESTIMATOR counts formatted-text characters (formatEvent output), not raw
    // getText() lengths. "User: u1"(8) + "Assistant: a1"(13) = 21 per turn.
    // Budget = 25 → turn2 fits (21 ≤ 25) but turn1+turn2 does not (42 > 25).
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 25,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("u1", "a1"), turn("u2", "a2"));

    const result = await strategy.compact(request);

    expect(result.compactedEvents).toHaveLength(2);
    expect(result.compactedEvents[0].message.text).toBe("u2");
    expect(result.compactedEvents[1].message.text).toBe("a2");
    expect(result.archivedEvents).toHaveLength(2);
  });

  it("stops at first oversize event keeps contiguous suffix", async () => {
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 10,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });

    const events = [
      userEvent("u1"), // 8 tokens
      assistantEvent("a1_very_large_text_here"), // 34 tokens — stops scan
      userEvent("u2"), // 8 tokens
    ];

    const result = await strategy.compact(requestWith(events));

    expect(result.compactedEvents).toHaveLength(1);
    expect(result.compactedEvents[0].message.text).toBe("u2");
    expect(result.archivedEvents).toHaveLength(2);
    expect(result.archivedEvents[0].message.text).toBe("u1");
    expect(result.archivedEvents[1].message.text).toBe(
      "a1_very_large_text_here",
    );
  });

  it("never keeps partial turn snaps to turn boundary", async () => {
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 4,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });

    const events = [
      userEvent("u1"), // 2 tokens
      assistantEvent("a1"), // 2 tokens
      userEvent("u2_longtxt"), // 10 tokens — stops scan
      assistantEvent("a2"), // 2 tokens
    ];

    const result = await strategy.compact(requestWith(events));

    // All events archived after snap removes the orphaned assistant reply
    expect(result.compactedEvents).toHaveLength(0);
    expect(result.archivedEvents).toHaveLength(4);
  });

  it("kept window always starts at user message", async () => {
    // Force a situation where the raw budget cut lands inside turn2 (at an assistant
    // message). The strategy must snap forward to the start of the next turn.
    // Turn1: "aaaa"(4) user + "bbbb"(4) assistant = 8 tokens
    // Turn2: "cccc"(4) user + "dddd"(4) assistant = 8 tokens
    // Turn3: "eeee"(4) user + "ffff"(4) assistant = 8 tokens
    // Budget = 6 tokens → only "ffff"(4) fits + "eeee"(4) = 8 > 6, so only ffff(4)
    // fits
    // Raw cutIndex = 6 - 1 = 5 → real[5] = ffff (ASSISTANT)
    // Snap: real[5]=ASSISTANT, real[6] doesn't exist → cutIndex becomes 6 (past end)
    // Result: no real events kept (all archived), only synthetics (none here)
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 6,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(
      turn("aaaa", "bbbb"),
      turn("cccc", "dddd"),
      turn("eeee", "ffff"),
    );

    const result = await strategy.compact(request);

    // The compacted list must not start with an ASSISTANT event
    const compacted = result.compactedEvents;
    const isSyntheticOrUser =
      compacted.length === 0 ||
      compacted[0].isSynthetic() ||
      compacted[0].message instanceof UserMessage;
    expect(isSyntheticOrUser).toBe(true);
  });

  it("synthetic events are always preserved and placed first", async () => {
    // Budget so small no real event fits
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 1,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });

    const events: SessionEvent[] = [];
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
        message: AssistantMessage.of("summary"),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );
    events.push(...turn("hello", "world"));

    const result = await strategy.compact(requestWith(events));

    // Summary turn: get(0)=USER shadow prompt, get(1)=ASSISTANT summary text
    expect(result.compactedEvents[0].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].isSynthetic()).toBe(true);
    expect(result.compactedEvents[1].message.text).toBe("summary");
  });

  it("max tokens zero is rejected", () => {
    expect(
      () =>
        new TokenCountCompactionStrategy({
          maxTokens: 0,
          tokenCountEstimator: CHAR_ESTIMATOR,
        }),
    ).toThrow("maxTokens must be greater than 0");
  });

  it("null request is rejected", async () => {
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 100,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    await expect(
      strategy.compact(null as unknown as CompactionRequest),
    ).rejects.toThrow("context must not be null");
  });

  it("empty session returns unchanged", async () => {
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 100,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const result = await strategy.compact(requestWith([]));

    expect(result.compactedEvents).toHaveLength(0);
    expect(result.archivedEvents).toHaveLength(0);
  });

  // --- branch-awareness ---

  it("snap skips branch user event on turn boundary", async () => {
    // Events (CHAR_ESTIMATOR costs based on formatEvent output):
    //   u1-root "User: u1" = 8, a1-root "Assistant: a1" = 13
    //   u2-sub  "User: u2" = 8, a2-sub  "Assistant: a2" = 13  (branch="sub")
    //   u3-root "User: u3" = 8, a3-root "Assistant: a3" = 13
    //
    // Backwards scan with budget=40:
    //   a3-root(13) fits, u3-root(8) → 21 fits, a2-sub(13) → 34 fits,
    //   u2-sub(8)   → 42 > 40, stop  →  rawCutIndex = 3 (a2-sub)
    //
    // snapToTurnStart(real, 3):
    //   idx=3: a2-sub (branch → not root → skip)
    //   idx=4: u3-root (root USER → stop)
    // → cutIndex=4, kept=[u3-root, a3-root]
    //
    // Without branch-awareness the old snap would have stopped at u2-sub (branch USER),
    // leaving the kept window starting on a sub-agent message.
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 40,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });

    const events = [
      userEvent("u1"),
      assistantEvent("a1"),
      userEvent("u2", "sub"),
      assistantEvent("a2", "sub"),
      userEvent("u3"),
      assistantEvent("a3"),
    ];

    const result = await strategy.compact(requestWith(events));

    // Kept window must start at root USER u3, not branch USER u2
    expect(result.compactedEvents).toHaveLength(2);
    expect(result.compactedEvents[0].message.text).toBe("u3");
    expect(result.compactedEvents[1].message.text).toBe("a3");
    expect(result.archivedEvents).toHaveLength(4); // u1, a1, u2-sub, a2-sub
  });

  // --- tool call / tool response token counting ---

  it("tool events count toward budget", async () => {
    // Budget = 40 chars (CHAR_ESTIMATOR: 1 char = 1 token).
    // Formatted tool-call and tool-response texts are ~45-55 chars each, which
    // pushes the total over the 40-token limit and forces archiving turn 1.
    // Before the fix, both events returned null from getText() and cost 0 tokens,
    // so the entire session was kept without archiving anything.
    const strategy = new TokenCountCompactionStrategy({
      maxTokens: 40,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });

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

    const result = await strategy.compact(requestWith(events));

    expect(result.archivedEvents.length).toBeGreaterThan(0);
    expect(result.tokensEstimatedSaved).toBeGreaterThan(0);
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
