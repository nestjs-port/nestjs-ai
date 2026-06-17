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
 * Tests for {@link InMemorySessionRepository}.
 */
describe("InMemorySessionRepository", () => {
  let repository: InMemorySessionRepository;

  beforeEach(() => {
    repository = new InMemorySessionRepository();
  });

  it("save and find by id round trip", async () => {
    const session = buildSession("user-1");

    const saved = await repository.save(session);
    const found = await repository.findById(saved.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(saved.id);
    expect(found!.userId).toBe("user-1");
  });

  it("find by id returns empty when not found", async () => {
    expect(await repository.findById("no-such-id")).toBeNull();
  });

  it("append event throws when session not found", async () => {
    const event = new SessionEvent({
      sessionId: "ghost-session",
      message: UserMessage.of("hi"),
    });
    await expect(repository.appendEvent(event)).rejects.toThrow(
      "Session not found",
    );
  });

  it("find events last n returns only last n events", async () => {
    const session = buildSession("user-2");
    await repository.save(session);

    for (let i = 1; i <= 5; i++) {
      await repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          message: UserMessage.of(`msg-${i}`),
        }),
      );
    }

    const last2 = await repository.findEvents(session.id, EventFilter.lastN(2));
    expect(last2).toHaveLength(2);
    expect(last2[0].message.text).toBe("msg-4");
    expect(last2[1].message.text).toBe("msg-5");
  });

  it("find events real only excludes synthetic", async () => {
    const session = buildSession("user-3");
    await repository.save(session);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("real"),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("Summarize the conversation we had so far."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "sliding-window",
        },
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: AssistantMessage.of("summary text"),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "sliding-window",
        },
      }),
    );

    const real = await repository.findEvents(
      session.id,
      EventFilter.realOnly(),
    );
    expect(real).toHaveLength(1);
    expect(real[0].message.text).toBe("real");
  });

  it("delete removes session", async () => {
    const session = buildSession("user-4");
    await repository.save(session);

    await repository.delete(session.id);

    expect(await repository.findById(session.id)).toBeNull();
  });

  it("find expired session ids returns expired ones", async () => {
    const active = buildSession("user-5");
    const expired = new Session({
      id: randomUUID(),
      userId: "user-5",
      expiresAt: new Date(Date.now() - 60_000),
    });

    await repository.save(active);
    await repository.save(expired);

    const expiredIds = await repository.findExpiredSessionIds(new Date());
    expect(expiredIds).toEqual([expired.id]);
    expect(expiredIds).not.toContain(active.id);
  });

  it("find by user id returns all sessions for user", async () => {
    await repository.save(buildSession("alice"));
    await repository.save(buildSession("alice"));
    await repository.save(buildSession("bob"));

    expect(await repository.findByUserId("alice")).toHaveLength(2);
    expect(await repository.findByUserId("bob")).toHaveLength(1);
  });

  it("get event version starts at zero and increments on append", async () => {
    const session = buildSession("user-6");
    await repository.save(session);

    expect(await repository.getEventVersion(session.id)).toBe(0);

    await repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: UserMessage.of("a") }),
    );
    expect(await repository.getEventVersion(session.id)).toBe(1);

    await repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: UserMessage.of("b") }),
    );
    expect(await repository.getEventVersion(session.id)).toBe(2);
  });

  it("replace events with correct version succeeds", async () => {
    const session = buildSession("user-7");
    await repository.save(session);
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("msg-1"),
      }),
    );

    const version = await repository.getEventVersion(session.id);
    const replacement = [
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("compacted"),
      }),
    ];

    const replaced = await repository.replaceEvents(
      session.id,
      replacement,
      version,
    );

    expect(replaced).toBe(true);
    expect(await repository.getEventVersion(session.id)).toBe(version + 1);
    expect(
      await repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(1);
    expect(
      (await repository.findEvents(session.id, EventFilter.all()))[0].message
        .text,
    ).toBe("compacted");
  });

  it("replace events with stale version fails", async () => {
    const session = buildSession("user-8");
    await repository.save(session);
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("msg-1"),
      }),
    );

    const staleVersion = (await repository.getEventVersion(session.id)) - 1;
    const replacement = [
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("should-not-land"),
      }),
    ];

    const replaced = await repository.replaceEvents(
      session.id,
      replacement,
      staleVersion,
    );

    expect(replaced).toBe(false);
    // Original event is still there
    expect(
      await repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(1);
    expect(
      (await repository.findEvents(session.id, EventFilter.all()))[0].message
        .text,
    ).toBe("msg-1");
  });

  it("replace events version incremented on unconditional replace", async () => {
    const session = buildSession("user-9");
    await repository.save(session);
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: UserMessage.of("original"),
      }),
    );

    const versionBefore = await repository.getEventVersion(session.id);
    await repository.replaceEvents(session.id, []);

    expect(await repository.getEventVersion(session.id)).toBe(
      versionBefore + 1,
    );
  });

  function buildSession(userId: string): Session {
    return new Session({ id: randomUUID(), userId });
  }
});
