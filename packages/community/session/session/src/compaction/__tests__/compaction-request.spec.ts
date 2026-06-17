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
import { SessionEvent } from "../../session-event.js";
import { Session } from "../../session.js";

/**
 * Tests for {@link CompactionRequest}.
 */
describe("CompactionRequest", () => {
  const SESSION_ID = "test-session";

  it("current turn count is zero for empty session", () => {
    const request = requestWith([]);
    expect(request.currentTurnCount).toBe(0);
  });

  it("current turn count equals number of user messages", () => {
    const events: SessionEvent[] = [];
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("q1"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("a1"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("q2"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("a2"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("q3"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("a3"),
      }),
    );

    const request = requestWith(events);

    expect(request.currentTurnCount).toBe(3);
  });

  it("synthetic events are not counted", () => {
    const events: SessionEvent[] = [];
    // Synthetic events that happen to look like user messages — must not count
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
        message: AssistantMessage.of("summary of earlier user turns"),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("q1"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("a1"),
      }),
    );

    const request = requestWith(events);

    expect(request.currentTurnCount).toBe(1);
  });

  it("assistant only session has zero turns", () => {
    const events: SessionEvent[] = [];
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("preamble"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("more preamble"),
      }),
    );

    const request = requestWith(events);

    expect(request.currentTurnCount).toBe(0);
  });

  it("branched user messages are not counted as turns", () => {
    // Sub-agents write USER messages attributed to their own branch; those must not
    // inflate the root turn count used by TurnCountTrigger.
    const events: SessionEvent[] = [];
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("root-q1"),
      }),
    ); // branch=null → counts
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("root-a1"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("sub-agent-q"),
        branch: "orch.researcher",
      }),
    ); // branch set → ignored
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("sub-agent-a"),
        branch: "orch.researcher",
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("root-q2"),
      }),
    ); // branch=null → counts
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("root-a2"),
      }),
    );

    const request = requestWith(events);

    expect(request.currentTurnCount).toBe(2);
  });

  it("current event count matches event list size", () => {
    const events: SessionEvent[] = [];
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("q1"),
      }),
    );
    events.push(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("a1"),
      }),
    );

    const request = requestWith(events);

    expect(request.currentEventCount).toBe(2);
  });

  it("of rejects null session", () => {
    expect(() => CompactionRequest.of(null as unknown as Session, [])).toThrow(
      "session must not be null",
    );
  });

  // --- helper ---

  function requestWith(events: SessionEvent[]): CompactionRequest {
    const session = new Session({ id: SESSION_ID, userId: "test-user" });
    return CompactionRequest.of(session, [...events]);
  }
});
