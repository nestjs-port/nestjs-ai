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

import { randomUUID } from "node:crypto";
import {
  AssistantMessage,
  MessageType,
  type ToolCall,
  type ToolResponse,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import {
  EventFilter,
  Session,
  SessionEvent,
  type SessionRepository,
} from "@nestjs-ai/session";
import { type JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { expect } from "vitest";

/**
 * Shared base suite for {@link SessionRepository} JSDBC integration tests. Concrete
 * dialect specs construct it with their container-backed repository and call these
 * methods from Vitest `it` blocks, mirroring the in-memory session repository contract so
 * every backend is verified against the same specification.
 *
 * `repository` is the auto-detected-dialect repository under test; `jsdbcTemplate` shares
 * its connection ({@link cleanUp} resets state between tests); `customDialectRepository`
 * is wired with an explicit dialect subclass, used to verify the branch filter SQL is
 * sourced from the dialect.
 */
export class AbstractJsdbcSessionRepositoryIT {
  constructor(
    private readonly repository: SessionRepository,
    private readonly jsdbcTemplate: JsdbcTemplate,
    private readonly customDialectRepository: SessionRepository,
  ) {}

  async cleanUp(): Promise<void> {
    await this.jsdbcTemplate.update(sql`DELETE FROM AI_SESSION`);
  }

  // Session lifecycle

  async saveAndFindByIdRoundTrip(): Promise<void> {
    const session = this.buildSession("user-1");
    await this.repository.save(session);

    const found = await this.repository.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(session.id);
    expect(found?.userId).toBe("user-1");
  }

  async savePreservesExpiresAtAndMetadata(): Promise<void> {
    const expiry = new Date(Date.now() + 3600_000);
    const session = new Session({
      id: randomUUID(),
      userId: "user-meta",
      expiresAt: expiry,
      metadata: { model: "gpt-4o" },
    });
    await this.repository.save(session);

    const found = await this.repository.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.expiresAt).not.toBeNull();
    expect(found?.expiresAt?.getTime()).toBe(expiry.getTime());
    expect(found?.metadata).toHaveProperty("model", "gpt-4o");
  }

  async saveUpsertUpdatesMetadataButPreservesEventVersion(): Promise<void> {
    const session = this.buildSession("user-upsert");
    await this.repository.save(session);
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hi" }),
      }),
    );
    const versionAfterAppend = await this.repository.getEventVersion(
      session.id,
    );

    const updated = new Session({
      id: session.id,
      userId: session.userId,
      metadata: { newKey: "newVal" },
    });
    await this.repository.save(updated);

    const found = await this.repository.findById(session.id);
    expect(found?.metadata).toHaveProperty("newKey", "newVal");
    expect(await this.repository.getEventVersion(session.id)).toBe(
      versionAfterAppend,
    );
    expect(
      await this.repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(1);
  }

  async findByIdReturnsEmptyWhenNotFound(): Promise<void> {
    expect(await this.repository.findById("no-such-id")).toBeNull();
  }

  async findByUserIdReturnsAllSessionsForUser(): Promise<void> {
    await this.repository.save(this.buildSession("alice"));
    await this.repository.save(this.buildSession("alice"));
    await this.repository.save(this.buildSession("bob"));

    expect(await this.repository.findByUserId("alice")).toHaveLength(2);
    expect(await this.repository.findByUserId("bob")).toHaveLength(1);
  }

  async deleteRemovesSessionAndCascadesToEvents(): Promise<void> {
    const session = this.buildSession("user-del");
    await this.repository.save(session);
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hi" }),
      }),
    );

    await this.repository.delete(session.id);

    expect(await this.repository.findById(session.id)).toBeNull();
    expect(
      await this.repository.findEvents(session.id, EventFilter.all()),
    ).toHaveLength(0);
  }

  async findExpiredSessionIdsReturnsOnlyExpiredOnes(): Promise<void> {
    const active = this.buildSession("user-active");
    const expired = new Session({
      id: randomUUID(),
      userId: "user-expired",
      expiresAt: new Date(Date.now() - 60_000),
    });
    await this.repository.save(active);
    await this.repository.save(expired);

    const expiredIds = await this.repository.findExpiredSessionIds(new Date());
    expect(expiredIds).toContain(expired.id);
    expect(expiredIds).not.toContain(active.id);
  }

  // Event append and retrieval

  async appendEventThrowsWhenSessionNotFound(): Promise<void> {
    const event = new SessionEvent({
      sessionId: "ghost-session",
      message: new UserMessage({ content: "hi" }),
    });
    await expect(this.repository.appendEvent(event)).rejects.toThrow(
      "Session not found",
    );
  }

  async appendedEventsAreReturnedInChronologicalOrder(): Promise<void> {
    const session = this.buildSession("user-order");
    await this.repository.save(session);

    for (let i = 1; i <= 4; i++) {
      // Use spaced-out explicit timestamps to guarantee ordering in SQL
      const ts = new Date((1_700_000_000 + i) * 1000);
      await this.repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const events = await this.repository.findEvents(
      session.id,
      EventFilter.all(),
    );
    expect(events).toHaveLength(4);
    expect(events[0].message.text).toBe("msg-1");
    expect(events[3].message.text).toBe("msg-4");
  }

  async findEventsLastNReturnsOnlyLastN(): Promise<void> {
    const session = this.buildSession("user-lastn");
    await this.repository.save(session);

    for (let i = 1; i <= 5; i++) {
      const ts = new Date((1_700_000_000 + i) * 1000);
      await this.repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const last2 = await this.repository.findEvents(
      session.id,
      EventFilter.lastN(2),
    );
    expect(last2).toHaveLength(2);
    expect(last2[0].message.text).toBe("msg-4");
    expect(last2[1].message.text).toBe("msg-5");
  }

  async findEventsRealOnlyExcludesSynthetic(): Promise<void> {
    const session = this.buildSession("user-synth");
    await this.repository.save(session);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "real" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "shadow prompt" }),
        metadata: { [SessionEvent.METADATA_SYNTHETIC]: true },
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "summary" }),
        metadata: { [SessionEvent.METADATA_SYNTHETIC]: true },
      }),
    );

    const real = await this.repository.findEvents(
      session.id,
      EventFilter.realOnly(),
    );
    expect(real).toHaveLength(1);
    expect(real[0].message.text).toBe("real");
  }

  async findEventsFilterByMessageType(): Promise<void> {
    const session = this.buildSession("user-types");
    await this.repository.save(session);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "q" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "a" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "q2" }),
      }),
    );

    const userOnly = await this.repository.findEvents(
      session.id,
      new EventFilter({ messageTypes: new Set([MessageType.USER]) }),
    );
    expect(userOnly).toHaveLength(2);
    expect(userOnly.every((e) => e.messageType === MessageType.USER)).toBe(
      true,
    );
  }

  async findEventsKeywordSearch(): Promise<void> {
    const session = this.buildSession("user-kw");
    await this.repository.save(session);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "hello world" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new AssistantMessage({ content: "goodbye" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "Hello again" }),
      }),
    );

    const results = await this.repository.findEvents(
      session.id,
      EventFilter.keywordSearch("hello"),
    );
    expect(results).toHaveLength(2);
    expect(
      results.every((e) => e.message.text?.toLowerCase().includes("hello")),
    ).toBe(true);
  }

  async findEventsFilterByTimeRange(): Promise<void> {
    const session = this.buildSession("user-time");
    await this.repository.save(session);

    const t1 = new Date("2025-01-01T10:00:00Z");
    const t2 = new Date("2025-01-01T11:00:00Z");
    const t3 = new Date("2025-01-01T12:00:00Z");

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t1,
        message: new UserMessage({ content: "early" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t2,
        message: new UserMessage({ content: "mid" }),
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        timestamp: t3,
        message: new UserMessage({ content: "late" }),
      }),
    );

    const inRange = await this.repository.findEvents(
      session.id,
      new EventFilter({ from: t1, to: t2 }),
    );
    expect(inRange).toHaveLength(2);
    expect(inRange[0].message.text).toBe("early");
    expect(inRange[1].message.text).toBe("mid");
  }

  async findEventsPagination(): Promise<void> {
    const session = this.buildSession("user-page");
    await this.repository.save(session);

    for (let i = 1; i <= 6; i++) {
      const ts = new Date((1_700_000_000 + i) * 1000);
      await this.repository.appendEvent(
        new SessionEvent({
          sessionId: session.id,
          timestamp: ts,
          message: new UserMessage({ content: `msg-${i}` }),
        }),
      );
    }

    const page0 = await this.repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 0 }),
    );
    const page1 = await this.repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 1 }),
    );
    const page2 = await this.repository.findEvents(
      session.id,
      new EventFilter({ pageSize: 2, page: 2 }),
    );

    expect(page0).toHaveLength(2);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page0[0].message.text).toBe("msg-1");
    expect(page1[0].message.text).toBe("msg-3");
    expect(page2[0].message.text).toBe("msg-5");
  }

  async findEventsReturnsEmptyListForNonExistentSession(): Promise<void> {
    expect(
      await this.repository.findEvents("ghost", EventFilter.all()),
    ).toHaveLength(0);
  }

  // Message type round-trips

  async assistantMessageWithToolCallsRoundTrip(): Promise<void> {
    const session = this.buildSession("user-tc");
    await this.repository.save(session);

    const toolCalls: ToolCall[] = [
      {
        id: "call-1",
        type: "function",
        name: "get_weather",
        arguments: '{"location":"Paris"}',
      },
    ];
    const msg = new AssistantMessage({ content: "", toolCalls });

    await this.repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: msg }),
    );

    const events = await this.repository.findEvents(
      session.id,
      EventFilter.all(),
    );
    expect(events).toHaveLength(1);
    expect(events[0].hasToolCalls()).toBe(true);
    const retrieved = events[0].message as AssistantMessage;
    expect(retrieved.toolCalls).toHaveLength(1);
    expect(retrieved.toolCalls[0].name).toBe("get_weather");
  }

  async toolResponseMessageRoundTrip(): Promise<void> {
    const session = this.buildSession("user-tr");
    await this.repository.save(session);

    const response: ToolResponse = {
      id: "call-1",
      name: "get_weather",
      responseData: '{"temp":"22C"}',
    };
    const msg = new ToolResponseMessage({ responses: [response] });

    await this.repository.appendEvent(
      new SessionEvent({ sessionId: session.id, message: msg }),
    );

    const events = await this.repository.findEvents(
      session.id,
      EventFilter.all(),
    );
    expect(events).toHaveLength(1);
    const retrieved = events[0].message as ToolResponseMessage;
    expect(retrieved.responses).toHaveLength(1);
    expect(retrieved.responses[0].name).toBe("get_weather");
  }

  // Versioning and CAS

  async getEventVersionStartsAtZeroAndIncrementsOnAppend(): Promise<void> {
    const session = this.buildSession("user-ver");
    await this.repository.save(session);

    expect(await this.repository.getEventVersion(session.id)).toBe(0);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "a" }),
      }),
    );
    expect(await this.repository.getEventVersion(session.id)).toBe(1);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "b" }),
      }),
    );
    expect(await this.repository.getEventVersion(session.id)).toBe(2);
  }

  async compactEventsIncrementsVersion(): Promise<void> {
    const session = this.buildSession("user-rv");
    await this.repository.save(session);
    const original = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "original" }),
    });
    await this.repository.appendEvent(original);

    const versionBefore = await this.repository.getEventVersion(session.id);
    await this.repository.compactEvents(
      session.id,
      [original],
      [],
      versionBefore,
    );
    expect(await this.repository.getEventVersion(session.id)).toBe(
      versionBefore + 1,
    );
  }

  async compactEventsWithCorrectVersionSucceeds(): Promise<void> {
    const session = this.buildSession("user-cas-ok");
    await this.repository.save(session);
    const e1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-1" }),
    });
    const e2 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-2" }),
    });
    await this.repository.appendEvent(e1);
    await this.repository.appendEvent(e2);

    const version = await this.repository.getEventVersion(session.id);
    const summary = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "summary" }),
    });

    const replaced = await this.repository.compactEvents(
      session.id,
      [e1],
      [summary, e2],
      version,
    );

    expect(replaced).toBe(true);
    expect(await this.repository.getEventVersion(session.id)).toBe(version + 1);
    // Active view excludes the archived event; ordered by seq (summary precedes window)
    const active = await this.repository.findEvents(
      session.id,
      EventFilter.active(),
    );
    expect(active.map((e) => e.message.text)).toEqual(["summary", "msg-2"]);
    // Full view retains the archived event ahead of the active window, flagged archived
    const all = await this.repository.findEvents(session.id, EventFilter.all());
    expect(all.map((e) => e.message.text)).toEqual([
      "msg-1",
      "summary",
      "msg-2",
    ]);
    expect(all[0].isArchived()).toBe(true);
    expect(all[1].isArchived()).toBe(false);
  }

  async compactEventsWithStaleVersionFails(): Promise<void> {
    const session = this.buildSession("user-cas-fail");
    await this.repository.save(session);
    const e1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "msg-1" }),
    });
    await this.repository.appendEvent(e1);

    const staleVersion =
      (await this.repository.getEventVersion(session.id)) - 1;
    const summary = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "should-not-land" }),
    });

    const replaced = await this.repository.compactEvents(
      session.id,
      [e1],
      [summary],
      staleVersion,
    );

    expect(replaced).toBe(false);
    const all = await this.repository.findEvents(session.id, EventFilter.all());
    expect(all).toHaveLength(1);
    expect(all[0].message.text).toBe("msg-1");
    expect(all[0].isArchived()).toBe(false);
  }

  async compactEventsPreservesPreviouslyArchivedEvents(): Promise<void> {
    const session = this.buildSession("user-archive-multi");
    await this.repository.save(session);
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
    await this.repository.appendEvent(e1);
    await this.repository.appendEvent(e2);
    await this.repository.appendEvent(e3);

    const summary1 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "s1" }),
    });
    const v1 = await this.repository.getEventVersion(session.id);
    await this.repository.compactEvents(
      session.id,
      [e1],
      [summary1, e2, e3],
      v1,
    );

    const summary2 = new SessionEvent({
      sessionId: session.id,
      message: new UserMessage({ content: "s2" }),
    });
    const v2 = await this.repository.getEventVersion(session.id);
    await this.repository.compactEvents(session.id, [e2], [summary2, e3], v2);

    expect(
      (await this.repository.findEvents(session.id, EventFilter.all())).map(
        (e) => e.message.text,
      ),
    ).toEqual(["e1", "e2", "s2", "e3"]);
    expect(
      (await this.repository.findEvents(session.id, EventFilter.active())).map(
        (e) => e.message.text,
      ),
    ).toEqual(["s2", "e3"]);
  }

  // Branch filtering

  async findEventsWithBranchFilterDelegatesToDialect(): Promise<void> {
    // Verify that the branch filter SQL comes from the dialect, not hardcoded.
    // A repository wired with a custom dialect subclass (built by the spec) is used to
    // confirm the call is made.
    const session = this.buildSession("user-dialect-wiring");
    await this.customDialectRepository.save(session);
    await this.customDialectRepository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "root" }),
        branch: null,
      }),
    );
    await this.customDialectRepository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "child" }),
        branch: "a.b",
      }),
    );

    const forChild = await this.customDialectRepository.findEvents(
      session.id,
      EventFilter.forBranch("a.b"),
    );
    expect(forChild).toHaveLength(2); // root + exact match
  }

  async findEventsWithBranchFilterIsolatesPeerAgents(): Promise<void> {
    const session = this.buildSession("user-branch");
    await this.repository.save(session);

    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "root" }),
        branch: null,
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by orchestrator" }),
        branch: "orch",
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by researcher" }),
        branch: "orch.researcher",
      }),
    );
    await this.repository.appendEvent(
      new SessionEvent({
        sessionId: session.id,
        message: new UserMessage({ content: "by writer" }),
        branch: "orch.writer",
      }),
    );

    const forResearcher = await this.repository.findEvents(
      session.id,
      EventFilter.forBranch("orch.researcher"),
    );

    expect(forResearcher).toHaveLength(3);
    expect(forResearcher.some((e) => e.message.text === "by writer")).toBe(
      false,
    );
  }

  private buildSession(userId: string): Session {
    return new Session({ id: randomUUID(), userId });
  }
}
