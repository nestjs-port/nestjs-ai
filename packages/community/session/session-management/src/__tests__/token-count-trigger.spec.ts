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
import { AssistantMessage, UserMessage } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { CompactionRequest } from "../compaction/compaction-request.js";
import { TokenCountTrigger } from "../compaction/token-count-trigger.js";
import { SessionEvent } from "../session-event.js";
import { Session } from "../session.js";

/**
 * Tests for {@link TokenCountTrigger}.
 */
describe("TokenCountTrigger", () => {
  const SESSION_ID = "test-session";

  /**
   * Deterministic estimator: each character counts as one token. Makes token arithmetic
   * exact and independent of the real BPE tokenizer.
   */
  const CHAR_ESTIMATOR: TokenCountEstimator = {
    estimate(
      input: string | null | MediaContent | Iterable<MediaContent>,
    ): number {
      return typeof input === "string" ? input.length : 0;
    },
  };

  it("fires when token count reaches threshold", () => {
    // "hello"(5) + "world"(5) = 10 tokens, threshold = 10 → fires (>=)
    const trigger = new TokenCountTrigger({
      threshold: 10,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("hello", "world"));

    expect(trigger.shouldCompact(request)).toBe(true);
  });

  it("fires when token count exceeds threshold", () => {
    // "hello"(5) + "world!"(6) = 11 tokens, threshold = 10
    const trigger = new TokenCountTrigger({
      threshold: 10,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("hello", "world!"));

    expect(trigger.shouldCompact(request)).toBe(true);
  });

  it("does not fire when token count below threshold", () => {
    // "hi"(2) + "ok"(2) = 4 tokens, threshold = 10
    const trigger = new TokenCountTrigger({
      threshold: 10,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("hi", "ok"));

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("does not fire on empty session", () => {
    const trigger = new TokenCountTrigger({
      threshold: 10,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith([]);

    expect(trigger.shouldCompact(request)).toBe(false);
  });

  it("counts tokens across all events", () => {
    // Two turns: "ab"(2)+"cd"(2) + "ef"(2)+"gh"(2) = 8 tokens, threshold = 7
    const trigger = new TokenCountTrigger({
      threshold: 7,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    const request = requestWith(turn("ab", "cd"), turn("ef", "gh"));

    expect(trigger.shouldCompact(request)).toBe(true);
  });

  it("zero threshold is rejected", () => {
    expect(
      () =>
        new TokenCountTrigger({
          threshold: 0,
          tokenCountEstimator: CHAR_ESTIMATOR,
        }),
    ).toThrow("threshold must be greater than 0");
  });

  it("negative threshold is rejected", () => {
    expect(
      () =>
        new TokenCountTrigger({
          threshold: -1,
          tokenCountEstimator: CHAR_ESTIMATOR,
        }),
    ).toThrow("threshold must be greater than 0");
  });

  it("null estimator is rejected", () => {
    expect(
      () =>
        new TokenCountTrigger({
          threshold: 100,
          tokenCountEstimator: null as unknown as TokenCountEstimator,
        }),
    ).toThrow("tokenCountEstimator must not be null");
  });

  it("get threshold returns configured value", () => {
    const trigger = new TokenCountTrigger({
      threshold: 500,
      tokenCountEstimator: CHAR_ESTIMATOR,
    });
    expect(trigger.threshold).toBe(500);
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
