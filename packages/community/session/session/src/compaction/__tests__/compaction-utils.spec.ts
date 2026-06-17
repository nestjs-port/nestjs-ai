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
import { CompactionUtils } from "../compaction-utils.js";
import { SessionEvent } from "../../session-event.js";

/**
 * Unit tests for {@link CompactionUtils.snapToTurnStart}.
 */
describe("CompactionUtils", () => {
  const SESSION_ID = "test-session";

  // --- cut already on a USER message ---

  it("cut at user message is returned unchanged", () => {
    const events = [user("u1"), assistant("a1"), user("u2"), assistant("a2")];

    expect(CompactionUtils.snapToTurnStart(events, 0)).toBe(0);
    expect(CompactionUtils.snapToTurnStart(events, 2)).toBe(2);
  });

  // --- cut on a non-USER message — advances to next USER ---

  it("cut on assistant message snaps to next user", () => {
    const events = [user("u1"), assistant("a1"), user("u2"), assistant("a2")];

    // cut lands on a1 (index 1) — should advance to u2 (index 2)
    expect(CompactionUtils.snapToTurnStart(events, 1)).toBe(2);
  });

  it("cut on last assistant message snaps to end", () => {
    const events = [user("u1"), assistant("a1"), user("u2"), assistant("a2")];

    // cut lands on a2 (index 3) — no USER after it, snaps to real.size()
    expect(CompactionUtils.snapToTurnStart(events, 3)).toBe(4);
  });

  // --- cut at boundaries ---

  it("cut at zero on user message returns zero", () => {
    const events = [user("u1"), assistant("a1")];

    expect(CompactionUtils.snapToTurnStart(events, 0)).toBe(0);
  });

  it("cut at size is returned unchanged", () => {
    const events = [user("u1"), assistant("a1")];

    expect(CompactionUtils.snapToTurnStart(events, events.length)).toBe(2);
  });

  // --- no USER message at or after the cut ---

  it("no user message after cut returns size", () => {
    // Only assistant messages — no USER to snap to
    const events = [assistant("a1"), assistant("a2"), assistant("a3")];

    expect(CompactionUtils.snapToTurnStart(events, 0)).toBe(3);
    expect(CompactionUtils.snapToTurnStart(events, 1)).toBe(3);
  });

  // --- multi-step tool interaction inside a turn ---

  it("cut in middle of multi step turn snaps to next turn start", () => {
    // turn 1: u1, a1, a2 (multi-step); turn 2: u2, a3
    const events = [
      user("u1"),
      assistant("a1"),
      assistant("a2"),
      user("u2"),
      assistant("a3"),
    ];

    // cut at a1 (index 1) — must skip a2 (index 2) and land on u2 (index 3)
    expect(CompactionUtils.snapToTurnStart(events, 1)).toBe(3);
    // cut at a2 (index 2) — same result
    expect(CompactionUtils.snapToTurnStart(events, 2)).toBe(3);
  });

  // --- empty list ---

  it("empty list returns zero", () => {
    expect(CompactionUtils.snapToTurnStart([], 0)).toBe(0);
  });

  // --- sub-agent (non-null branch) events are turn-internal, never turn starts ---

  it("cut on sub agent user snaps to next root user", () => {
    // turn 1: u1, a1; sub-agent turn (branch "sub"): u2, a2; turn 2: u3
    const events = [
      user("u1"),
      assistant("a1"),
      user("u2", "sub"),
      assistant("a2", "sub"),
      user("u3"),
    ];

    // cut at u2 (index 2) — a sub-agent USER, skips the branch and lands on u3 (index 4)
    expect(CompactionUtils.snapToTurnStart(events, 2)).toBe(4);
  });

  it("cut in middle of multi step sub agent turn snaps to next root user", () => {
    // turn 1: u1, a1; sub-agent turn (branch "sub"): u2, a2 (tool call), t1, a3; turn 2: u3
    const events = [
      user("u1"),
      assistant("a1"),
      user("u2", "sub"),
      assistantToolCall("sub"),
      tool("sub"),
      assistant("a3", "sub"),
      user("u3"),
    ];

    // cut at t1 (index 4) — must skip the rest of the branch and land on u3 (index 6)
    expect(CompactionUtils.snapToTurnStart(events, 4)).toBe(6);
    // cut at u2 (index 2) — same result
    expect(CompactionUtils.snapToTurnStart(events, 2)).toBe(6);
  });

  it("cut on peer branch users snaps past all of them", () => {
    // peer branch 1: u1, a1; peer branch 2: u2, a2; root turn: u3
    const events = [
      user("u1", "peer1"),
      assistant("a1", "peer1"),
      user("u2", "peer2"),
      assistant("a2", "peer2"),
      user("u3"),
    ];

    // cut at u1 (index 0) — only null-branch matters, not branch identity; skip both peers, land on u3 (index 4)
    expect(CompactionUtils.snapToTurnStart(events, 0)).toBe(4);
  });

  // --- no null-branch USER at or after the cut ---

  it("only sub agent events after cut returns size", () => {
    // sub-agent turn only (branch "sub"): u1, a1 — no root USER to snap to
    const events = [user("u1", "sub"), assistant("a1", "sub")];

    expect(CompactionUtils.snapToTurnStart(events, 0)).toBe(2);
  });

  // --- helpers ---

  function user(text: string, branch: string | null = null): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of(text),
      branch,
    });
  }

  function assistant(text: string, branch: string | null = null): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(text),
      branch,
    });
  }

  function assistantToolCall(branch: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: new AssistantMessage({
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            name: "get_weather",
            arguments: "{}",
          },
        ],
      }),
      branch,
    });
  }

  function tool(branch: string): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: new ToolResponseMessage({
        responses: [
          { id: "call-1", name: "get_weather", responseData: '{"temp":"22C"}' },
        ],
      }),
      branch,
    });
  }
});
