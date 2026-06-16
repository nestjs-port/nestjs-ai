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
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { EventFilter } from "../event-filter.js";
import { InMemorySessionRepository } from "../in-memory-session-repository.js";
import { SessionEvent } from "../session-event.js";
import { Session } from "../session.js";

/**
 * Tests for branch-based isolation in {@link SessionEvent} and {@link EventFilter}.
 *
 * Models the multi-agent visibility rule: an event at branch `X` is visible to an agent at
 * branch `Y` if `X` is null (root), equals `Y`, or is a dot-prefix ancestor of `Y`. Sibling
 * branches and child branches are hidden.
 */
describe("EventFilterBranch", () => {
  const SESSION_ID = "test-session";

  let repository: InMemorySessionRepository;

  beforeEach(async () => {
    repository = new InMemorySessionRepository();
    await repository.save(new Session({ id: SESSION_ID, userId: "test-user" }));
  });

  // --- SessionEvent.branch() ---

  it("builder without branch has null branch", () => {
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("hello"),
    });
    expect(event.branch).toBeNull();
  });

  it("builder with branch stores branch", () => {
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("hello"),
      branch: "orch.researcher",
    });
    expect(event.branch).toBe("orch.researcher");
  });

  it("builder with null branch has null branch", () => {
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("hello"),
      branch: null,
    });
    expect(event.branch).toBeNull();
  });

  it("synthetic summary turn events have null branch", () => {
    const turn = [
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("Summarize the conversation we had so far."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("The user asked about X."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    ];
    expect(turn.every((e) => e.branch === null)).toBe(true);
  });

  // --- EventFilter.matches() — branch visibility ---

  it("null filter branch matches all events", () => {
    // No branch filter → all events visible regardless of their branch
    const noFilter = EventFilter.all();
    expect(noFilter.matches(event(null))).toBe(true);
    expect(noFilter.matches(event("orch"))).toBe(true);
    expect(noFilter.matches(event("orch.researcher"))).toBe(true);
  });

  it("root events are visible to all agents", () => {
    // Events with null branch are pre-delegation; visible everywhere
    const filter = EventFilter.forBranch("orch.researcher");
    expect(filter.matches(event(null))).toBe(true);
  });

  it("agent sees its own branch events", () => {
    const filter = EventFilter.forBranch("orch.researcher");
    expect(filter.matches(event("orch.researcher"))).toBe(true);
  });

  it("agent sees ancestor branch events", () => {
    // "orch" is an ancestor of "orch.researcher"
    const filter = EventFilter.forBranch("orch.researcher");
    expect(filter.matches(event("orch"))).toBe(true);
  });

  it("agent sees deep ancestor branch events", () => {
    // "orch" is an ancestor of "orch.researcher.summarizer"
    const filter = EventFilter.forBranch("orch.researcher.summarizer");
    expect(filter.matches(event("orch"))).toBe(true);
    expect(filter.matches(event("orch.researcher"))).toBe(true);
    expect(filter.matches(event("orch.researcher.summarizer"))).toBe(true);
  });

  it("agent does not see sibling branch events", () => {
    // "orch.writer" is a sibling of "orch.researcher" — not visible
    const filter = EventFilter.forBranch("orch.researcher");
    expect(filter.matches(event("orch.writer"))).toBe(false);
  });

  it("agent does not see child branch events", () => {
    // "orch.researcher.summarizer" is a child — parent doesn't see child's events
    const filter = EventFilter.forBranch("orch.researcher");
    expect(filter.matches(event("orch.researcher.summarizer"))).toBe(false);
  });

  it("branch prefix match requires dot separator", () => {
    // "orcha" should NOT match as an ancestor of "orch.researcher" even though
    // "orch.researcher".startsWith("orcha") is false — but let's also test that
    // "orch" is NOT confused with "orchestra"
    const filter = EventFilter.forBranch("orchestra.researcher");
    expect(filter.matches(event("orch"))).toBe(false); // "orch" ≠ prefix of
    // "orchestra"
    expect(filter.matches(event("orchestra"))).toBe(true); // exact ancestor
  });

  // --- Repository integration ---

  it("repository returns branch filtered events", async () => {
    await append(event(null)); // root event — visible to all
    await append(event("orch")); // orchestrator event
    await append(event("orch.researcher")); // researcher's own event
    await append(event("orch.writer")); // sibling — should be hidden from researcher

    const visible = await repository.findEvents(
      SESSION_ID,
      EventFilter.forBranch("orch.researcher"),
    );

    expect(visible).toHaveLength(3);
    expect(
      visible.every(
        (e) =>
          e.branch === null ||
          e.branch === "orch" ||
          e.branch === "orch.researcher",
      ),
    ).toBe(true);
  });

  it("repository hides sibling and child events from agent", async () => {
    await append(event("orch.researcher"));
    await append(event("orch.writer")); // sibling
    await append(event("orch.researcher.summarizer")); // child

    const visible = await repository.findEvents(
      SESSION_ID,
      EventFilter.forBranch("orch.researcher"),
    );

    expect(visible).toHaveLength(1);
    expect(visible[0].branch).toBe("orch.researcher");
  });

  it("synthetic events with null branch are always visible", async () => {
    await append(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of("Summarize the conversation we had so far."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );
    await append(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: AssistantMessage.of("Prior conversation summary."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );
    await append(event("orch.writer")); // unrelated branch

    const visible = await repository.findEvents(
      SESSION_ID,
      EventFilter.forBranch("orch.researcher"),
    );

    // Both synthetic events (null branch) are visible; writer event is not
    expect(visible).toHaveLength(2);
    expect(visible.every((e) => e.isSynthetic())).toBe(true);
  });

  // --- helpers ---

  function event(branch: string | null): SessionEvent {
    return new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(`msg-${randomUUID()}`),
      branch,
    });
  }

  async function append(event: SessionEvent): Promise<void> {
    await repository.appendEvent(event);
  }
});
