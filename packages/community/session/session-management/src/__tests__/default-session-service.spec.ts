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

import { UserMessage } from "@nestjs-ai/model";
import { ms } from "@nestjs-port/core";
import { beforeEach, describe, expect, it } from "vitest";
import { SlidingWindowCompactionStrategy } from "../compaction/sliding-window-compaction-strategy.js";
import { CreateSessionRequest } from "../create-session-request.js";
import { DefaultSessionService } from "../default-session-service.js";
import { EventFilter } from "../event-filter.js";
import { InMemorySessionRepository } from "../in-memory-session-repository.js";
import type { SessionService } from "../session-service.js";

/**
 * Tests for {@link DefaultSessionService}.
 */
describe("DefaultSessionService", () => {
  let service: SessionService;

  beforeEach(() => {
    service = new DefaultSessionService(new InMemorySessionRepository());
  });

  it("create returns session", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    expect(session).not.toBeNull();
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.userId).toBe("user-1");
    expect(await service.getEvents(session.id)).toHaveLength(0);
  });

  it("append message then get messages returns that message", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    await service.appendMessage(session.id, UserMessage.of("hello"));

    const messages = await service.getMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("hello");
  });

  it("append multiple messages preserves order", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    await service.appendMessage(session.id, UserMessage.of("first"));
    await service.appendMessage(session.id, UserMessage.of("second"));
    await service.appendMessage(session.id, UserMessage.of("third"));

    const messages = await service.getMessages(session.id);
    expect(messages).toHaveLength(3);
    expect(messages[0].text).toBe("first");
    expect(messages[1].text).toBe("second");
    expect(messages[2].text).toBe("third");
  });

  it("delete removes session", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    await service.delete(session.id);

    expect(await service.findById(session.id)).toBeNull();
  });

  it("find by user id returns all sessions", async () => {
    await service.create(new CreateSessionRequest({ userId: "alice" }));
    await service.create(new CreateSessionRequest({ userId: "alice" }));
    await service.create(new CreateSessionRequest({ userId: "bob" }));

    expect(await service.findByUserId("alice")).toHaveLength(2);
    expect(await service.findByUserId("bob")).toHaveLength(1);
  });

  it("compact with sliding window keeps only max events", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    for (let i = 1; i <= 5; i++) {
      await service.appendMessage(session.id, UserMessage.of(`msg-${i}`));
    }

    const result = await service.compact(
      session.id,
      { shouldCompact: () => true },
      new SlidingWindowCompactionStrategy({ maxEvents: 2 }),
    );

    expect(result.eventsRemoved()).toBe(3);
    expect(result.compactedEvents).toHaveLength(2);

    const messages = await service.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("msg-4");
    expect(messages[1].text).toBe("msg-5");
  });

  it("compact no op when trigger does not fire", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );
    await service.appendMessage(session.id, UserMessage.of("only message"));

    // Trigger never fires — no compaction, no repository write
    const result = await service.compact(
      session.id,
      { shouldCompact: () => false },
      new SlidingWindowCompactionStrategy({ maxEvents: 10 }),
    );

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(await service.getEvents(session.id)).toHaveLength(1);
  });

  it("compact no op when strategy archives nothing", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );
    await service.appendMessage(session.id, UserMessage.of("only message"));

    // Trigger fires but window is larger than event count — strategy returns no-op
    const result = await service.compact(
      session.id,
      { shouldCompact: () => true },
      new SlidingWindowCompactionStrategy({ maxEvents: 10 }),
    );

    expect(result.archivedEvents).toHaveLength(0);
    expect(result.eventsRemoved()).toBe(0);
    expect(await service.getEvents(session.id)).toHaveLength(1);
  });

  it("compact with preloaded session produces same result as session id overload", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    for (let i = 1; i <= 5; i++) {
      await service.appendMessage(session.id, UserMessage.of(`msg-${i}`));
    }

    // Session-object overload skips the internal findById() round-trip but must
    // produce an identical result to the sessionId overload.
    const result = await service.compact(
      session.id,
      { shouldCompact: () => true },
      new SlidingWindowCompactionStrategy({ maxEvents: 2 }),
    );

    expect(result.eventsRemoved()).toBe(3);
    expect(result.compactedEvents).toHaveLength(2);

    const messages = await service.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("msg-4");
    expect(messages[1].text).toBe("msg-5");
  });

  it("get events with filter applies filter", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    await service.appendMessage(session.id, UserMessage.of("a"));
    await service.appendMessage(session.id, UserMessage.of("b"));
    await service.appendMessage(session.id, UserMessage.of("c"));

    const last2 = await service.getEvents(session.id, EventFilter.lastN(2));
    expect(last2).toHaveLength(2);
    expect(last2[0].message.text).toBe("b");
    expect(last2[1].message.text).toBe("c");
  });

  it("concurrent compaction only applies once", async () => {
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );

    for (let i = 1; i <= 5; i++) {
      await service.appendMessage(session.id, UserMessage.of(`msg-${i}`));
    }

    // Two threads race to compact the same session to a window of 2.
    // The CAS in replaceEvents guarantees that only the first writer lands;
    // the second detects a version mismatch and skips silently.
    const results = await Promise.all([
      service.compact(
        session.id,
        { shouldCompact: () => true },
        new SlidingWindowCompactionStrategy({ maxEvents: 2 }),
      ),
      service.compact(
        session.id,
        { shouldCompact: () => true },
        new SlidingWindowCompactionStrategy({ maxEvents: 2 }),
      ),
    ]);

    // Exactly one compaction must have removed 3 events; the other is a no-op.
    const totalRemoved =
      results[0].eventsRemoved() + results[1].eventsRemoved();
    expect(totalRemoved).toBe(3);

    // The surviving event list must be exactly the last 2 messages.
    const messages = await service.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("msg-4");
    expect(messages[1].text).toBe("msg-5");
  });

  // --- deleteExpiredSessions ---

  it("delete expired sessions removes only expired sessions", async () => {
    const active = await service.create(
      new CreateSessionRequest({
        userId: "u1",
        timeToLive: ms(60 * 60 * 1000),
      }),
    );
    const expired = await service.create(
      new CreateSessionRequest({
        userId: "u2",
        timeToLive: ms(-1000), // already in the past
      }),
    );

    const deleted = await service.deleteExpiredSessions(new Date());

    expect(deleted).toBe(1);
    expect(await service.findById(active.id)).not.toBeNull();
    expect(await service.findById(expired.id)).toBeNull();
  });

  it("delete expired sessions returns zero when none expired", async () => {
    await service.create(
      new CreateSessionRequest({
        userId: "u1",
        timeToLive: ms(60 * 60 * 1000),
      }),
    );

    const deleted = await service.deleteExpiredSessions(new Date());

    expect(deleted).toBe(0);
  });

  it("delete expired sessions returns zero when no sessions", async () => {
    expect(await service.deleteExpiredSessions(new Date())).toBe(0);
  });
});
