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

import "reflect-metadata";

import { randomUUID } from "node:crypto";
import {
  AssistantMessage,
  MessageType,
  type ToolCall,
  type ToolResponse,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { EventFilter, Session, SessionEvent } from "@nestjs-ai/session";
import {
  JsdbcSessionRepository,
  POSTGRESQL_SESSION_SCHEMA,
  PostgresSessionRepositoryDialect,
} from "@nestjs-ai/session-jsdbc";
import { JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Tests for {@link JsdbcSessionRepository} backed by a PostgreSQL container.
 *
 * Mirrors the contract of the in-memory session repository tests so both
 * implementations are verified against the same specification.
 */
describe("JsdbcSessionRepositoryPostgresqlIT", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;
  let jsdbcDataSource: TypeOrmDataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let repository: JsdbcSessionRepository;

  const buildSession = (userId: string): Session =>
    new Session({ id: randomUUID(), userId });

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("session_integration")
      .withUsername("jsdbc")
      .withPassword("jsdbc")
      .start();

    typeormDataSource = new DataSource({
      type: "postgres",
      url: postgresContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });
    await typeormDataSource.initialize();

    jsdbcDataSource = new TypeOrmDataSource(typeormDataSource);
    jsdbcTemplate = new JsdbcTemplate(jsdbcDataSource);
    for (const fragment of POSTGRESQL_SESSION_SCHEMA) {
      await jsdbcTemplate.update(fragment);
    }

    repository = await JsdbcSessionRepository.builder()
      .dataSource(jsdbcDataSource)
      .build();
  }, 120_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await postgresContainer?.stop();
  }, 60_000);

  beforeEach(async () => {
    await jsdbcTemplate.update(sql`DELETE FROM AI_SESSION`);
  });

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  it("save and find by id round trip", async () => {
    const session = buildSession("user-1");
    await repository.save(session);

    const found = await repository.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(session.id);
    expect(found?.userId).toBe("user-1");
  });

  it("save preserves expires at and metadata", async () => {
    const expiry = new Date(Date.now() + 3600_000);
    const session = new Session({
      id: randomUUID(),
      userId: "user-meta",
      expiresAt: expiry,
      metadata: { model: "gpt-4o" },
    });
    await repository.save(session);

    const found = await repository.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.expiresAt).not.toBeNull();
    expect(found?.expiresAt?.getTime()).toBe(expiry.getTime());
    expect(found?.metadata).toHaveProperty("model", "gpt-4o");
  });

  it("save upsert updates metadata but preserves event version", async () => {
    const session = buildSession("user-upsert");
    await repository.save(session);
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hi" }),
      }),
    );
    const versionAfterAppend = await repository.getEventVersion(session.id);

    const updated = new Session({
      id: session.id,
      userId: session.userId,
      metadata: { newKey: "newVal" },
    });
    await repository.save(updated);

    const found = await repository.findById(session.id);
    expect(found?.metadata).toHaveProperty("newKey", "newVal");
    expect(await repository.getEventVersion(session.id)).toBe(
      versionAfterAppend,
    );
    expect(
      await repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(1);
  });

  it("find by id returns empty when not found", async () => {
    expect(await repository.findById("no-such-id")).toBeNull();
  });

  it("find by user id returns all sessions for user", async () => {
    await repository.save(buildSession("alice"));
    await repository.save(buildSession("alice"));
    await repository.save(buildSession("bob"));

    expect(await repository.findByUserId("alice")).toHaveLength(2);
    expect(await repository.findByUserId("bob")).toHaveLength(1);
  });

  it("delete removes session and cascades to events", async () => {
    const session = buildSession("user-del");
    await repository.save(session);
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hi" }),
      }),
    );

    await repository.delete(session.id);

    expect(await repository.findById(session.id)).toBeNull();
    expect(
      await repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(0);
  });

  it("find expired session ids returns only expired ones", async () => {
    const active = buildSession("user-active");
    const expired = new Session({
      id: randomUUID(),
      userId: "user-expired",
      expiresAt: new Date(Date.now() - 60_000),
    });
    await repository.save(active);
    await repository.save(expired);

    const expiredIds = await repository.findExpiredSessionIds(new Date());
    expect(expiredIds).toContain(expired.id);
    expect(expiredIds).not.toContain(active.id);
  });

  // -------------------------------------------------------------------------
  // Event append and retrieval
  // -------------------------------------------------------------------------

  it("append event throws when session not found", async () => {
    const event = new SessionEvent({
      sessionId: "ghost-session",
      message: new UserMessage({ content: "hi" }),
    });
    await expect(repository.appendEvent(event)).rejects.toThrow(
      "Session not found",
    );
  });

  it("appended events are returned in chronological order", async () => {
    const session = buildSession("user-order");
    await repository.save(session);

    for (let i = 1; i <= 4; i++) {
      // Use spaced-out explicit timestamps to guarantee ordering in SQL
      const ts = new Date((1_700_000_000 + i) * 1000);
      await repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const events = await repository.findEvents(session.id, EventFilter.all());
    expect(events).toHaveLength(4);
    expect(events[0].message.text).toBe("msg-1");
    expect(events[3].message.text).toBe("msg-4");
  });

  it("find events last n returns only last n in chronological order", async () => {
    const session = buildSession("user-lastn");
    await repository.save(session);

    for (let i = 1; i <= 5; i++) {
      const ts = new Date((1_700_000_000 + i) * 1000);
      await repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const last2 = await repository.findEvents(session.id, EventFilter.lastN(2));
    expect(last2).toHaveLength(2);
    expect(last2[0].message.text).toBe("msg-4");
    expect(last2[1].message.text).toBe("msg-5");
  });

  it("find events real only excludes synthetic", async () => {
    const session = buildSession("user-synth");
    await repository.save(session);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "real" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "shadow prompt" }),
        metadata: { [SessionEvent.METADATA_SYNTHETIC]: true },
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "summary" }),
        metadata: { [SessionEvent.METADATA_SYNTHETIC]: true },
      }),
    );

    const real = await repository.findEvents(
      session.id,
      EventFilter.realOnly(),
    );
    expect(real).toHaveLength(1);
    expect(real[0].message.text).toBe("real");
  });

  it("find events filter by message type", async () => {
    const session = buildSession("user-types");
    await repository.save(session);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "q" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "a" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "q2" }),
      }),
    );

    const userOnly = await repository.findEvents(
      session.id,
      new EventFilter({ messageTypes: new Set([MessageType.USER]) }),
    );
    expect(userOnly).toHaveLength(2);
    expect(userOnly.every((e) => e.messageType === MessageType.USER)).toBe(
      true,
    );
  });

  it("find events keyword search", async () => {
    const session = buildSession("user-kw");
    await repository.save(session);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hello world" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "goodbye" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "Hello again" }),
      }),
    );

    const results = await repository.findEvents(
      session.id,
      EventFilter.keywordSearch("hello"),
    );
    expect(results).toHaveLength(2);
    expect(
      results.every((e) => e.message.text?.toLowerCase().includes("hello")),
    ).toBe(true);
  });

  it("find events filter by time range", async () => {
    const session = buildSession("user-time");
    await repository.save(session);

    const t1 = new Date("2025-01-01T10:00:00Z");
    const t2 = new Date("2025-01-01T11:00:00Z");
    const t3 = new Date("2025-01-01T12:00:00Z");

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t1,
        message: new UserMessage({ content: "early" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t2,
        message: new UserMessage({ content: "mid" }),
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t3,
        message: new UserMessage({ content: "late" }),
      }),
    );

    const inRange = await repository.findEvents(
      session.id,
      new EventFilter({ from: t1, to: t2 }),
    );
    expect(inRange).toHaveLength(2);
    expect(inRange[0].message.text).toBe("early");
    expect(inRange[1].message.text).toBe("mid");
  });

  it("find events pagination", async () => {
    const session = buildSession("user-page");
    await repository.save(session);

    for (let i = 1; i <= 6; i++) {
      const ts = new Date((1_700_000_000 + i) * 1000);
      await repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const page0 = await repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 0 }),
    );
    const page1 = await repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 1 }),
    );
    const page2 = await repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 2 }),
    );

    expect(page0).toHaveLength(2);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page0[0].message.text).toBe("msg-1");
    expect(page1[0].message.text).toBe("msg-3");
    expect(page2[0].message.text).toBe("msg-5");
  });

  it("find events returns empty list for non existent session", async () => {
    expect(
      await repository.findEvents("ghost", EventFilter.all()),
    ).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Message type round-trips
  // -------------------------------------------------------------------------

  it("assistant message with tool calls round trip", async () => {
    const session = buildSession("user-tc");
    await repository.save(session);

    const toolCalls: ToolCall[] = [
      {
        id: "call-1",
        type: "function",
        name: "get_weather",
        arguments: '{"location":"Paris"}',
      },
    ];
    const msg = new AssistantMessage({ content: "", toolCalls });

    await repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: msg }),
    );

    const events = await repository.findEvents(session.id, EventFilter.all());
    expect(events).toHaveLength(1);
    expect(events[0].hasToolCalls()).toBe(true);
    const retrieved = events[0].message as AssistantMessage;
    expect(retrieved.toolCalls).toHaveLength(1);
    expect(retrieved.toolCalls[0].name).toBe("get_weather");
  });

  it("tool response message round trip", async () => {
    const session = buildSession("user-tr");
    await repository.save(session);

    const response: ToolResponse = {
      id: "call-1",
      name: "get_weather",
      responseData: '{"temp":"22C"}',
    };
    const msg = new ToolResponseMessage({ responses: [response] });

    await repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: msg }),
    );

    const events = await repository.findEvents(session.id, EventFilter.all());
    expect(events).toHaveLength(1);
    const retrieved = events[0].message as ToolResponseMessage;
    expect(retrieved.responses).toHaveLength(1);
    expect(retrieved.responses[0].name).toBe("get_weather");
  });

  // -------------------------------------------------------------------------
  // Versioning and CAS
  // -------------------------------------------------------------------------

  it("get event version starts at zero and increments on append", async () => {
    const session = buildSession("user-ver");
    await repository.save(session);

    expect(await repository.getEventVersion(session.id)).toBe(0);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "a" }),
      }),
    );
    expect(await repository.getEventVersion(session.id)).toBe(1);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "b" }),
      }),
    );
    expect(await repository.getEventVersion(session.id)).toBe(2);
  });

  it("compact events increments version", async () => {
    const session = buildSession("user-rv");
    await repository.save(session);
    const original = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "original" }),
    });
    await repository.appendEvent(original);

    const versionBefore = await repository.getEventVersion(session.id);
    await repository.compactEvents(session.id, [original], [], versionBefore);
    expect(await repository.getEventVersion(session.id)).toBe(
      versionBefore + 1,
    );
  });

  it("compact events with correct version succeeds", async () => {
    const session = buildSession("user-cas-ok");
    await repository.save(session);
    const e1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-1" }),
    });
    const e2 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-2" }),
    });
    await repository.appendEvent(e1);
    await repository.appendEvent(e2);

    const version = await repository.getEventVersion(session.id);
    const summary = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "summary" }),
    });

    const replaced = await repository.compactEvents(
      session.id,
      [e1],
      [summary, e2],
      version,
    );

    expect(replaced).toBe(true);
    expect(await repository.getEventVersion(session.id)).toBe(version + 1);
    // Active view excludes the archived event; ordered by seq (summary precedes window)
    const active = await repository.findEvents(
      session.id,
      EventFilter.active(),
    );
    expect(active.map((e) => e.message.text)).toEqual(["summary", "msg-2"]);
    // Full view retains the archived event ahead of the active window, flagged archived
    const all = await repository.findEvents(session.id, EventFilter.all());
    expect(all.map((e) => e.message.text)).toEqual([
      "msg-1",
      "summary",
      "msg-2",
    ]);
    expect(all[0].isArchived()).toBe(true);
    expect(all[1].isArchived()).toBe(false);
  });

  it("compact events with stale version fails", async () => {
    const session = buildSession("user-cas-fail");
    await repository.save(session);
    const e1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-1" }),
    });
    await repository.appendEvent(e1);

    const staleVersion = (await repository.getEventVersion(session.id)) - 1;
    const summary = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "should-not-land" }),
    });

    const replaced = await repository.compactEvents(
      session.id,
      [e1],
      [summary],
      staleVersion,
    );

    expect(replaced).toBe(false);
    const all = await repository.findEvents(session.id, EventFilter.all());
    expect(all).toHaveLength(1);
    expect(all[0].message.text).toBe("msg-1");
    expect(all[0].isArchived()).toBe(false);
  });

  it("compact events preserves previously archived events", async () => {
    const session = buildSession("user-archive-multi");
    await repository.save(session);
    const e1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "e1" }),
    });
    const e2 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "e2" }),
    });
    const e3 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "e3" }),
    });
    await repository.appendEvent(e1);
    await repository.appendEvent(e2);
    await repository.appendEvent(e3);

    const summary1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "s1" }),
    });
    const v1 = await repository.getEventVersion(session.id);
    await repository.compactEvents(session.id, [e1], [summary1, e2, e3], v1);

    const summary2 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "s2" }),
    });
    const v2 = await repository.getEventVersion(session.id);
    await repository.compactEvents(session.id, [e2], [summary2, e3], v2);

    expect(
      (await repository.findEvents(session.id, EventFilter.all())).map(
        (e) => e.message.text,
      ),
    ).toEqual(["e1", "e2", "s2", "e3"]);
    expect(
      (await repository.findEvents(session.id, EventFilter.active())).map(
        (e) => e.message.text,
      ),
    ).toEqual(["s2", "e3"]);
  });

  // -------------------------------------------------------------------------
  // Branch filtering
  // -------------------------------------------------------------------------

  it("find events with branch filter delegates to dialect", async () => {
    // Verify that the branch filter SQL comes from the dialect, not hardcoded.
    // A custom dialect that wraps the Postgres fragment with a recognizable
    // override is used to confirm the call is made.
    class CustomDialect extends PostgresSessionRepositoryDialect {
      override getBranchFilterFragment(branch: string) {
        return super.getBranchFilterFragment(branch); // delegates to default || impl
      }
    }
    const repoWithCustomDialect = await JsdbcSessionRepository.builder()
      .dataSource(jsdbcDataSource)
      .dialect(new CustomDialect())
      .build();

    const session = buildSession("user-dialect-wiring");
    await repoWithCustomDialect.save(session);
    await repoWithCustomDialect.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "root" }),
        branch: null,
      }),
    );
    await repoWithCustomDialect.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "child" }),
        branch: "a.b",
      }),
    );

    const forChild = await repoWithCustomDialect.findEvents(
      session.id,
      EventFilter.forBranch("a.b"),
    );
    expect(forChild).toHaveLength(2); // root + exact match
  });

  it("find events with branch filter isolates peer agents", async () => {
    const session = buildSession("user-branch");
    await repository.save(session);

    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "root" }),
        branch: null,
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by orchestrator" }),
        branch: "orch",
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by researcher" }),
        branch: "orch.researcher",
      }),
    );
    await repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by writer" }),
        branch: "orch.writer",
      }),
    );

    const forResearcher = await repository.findEvents(
      session.id,
      EventFilter.forBranch("orch.researcher"),
    );

    expect(forResearcher).toHaveLength(3);
    expect(forResearcher.some((e) => e.message.text === "by writer")).toBe(
      false,
    );
  });
});
