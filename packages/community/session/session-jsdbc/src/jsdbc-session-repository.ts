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

import assert from "node:assert/strict";
import {
  AssistantMessage,
  type Message,
  MessageType,
  SystemMessage,
  type ToolCall,
  type ToolResponse,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import {
  type EventFilter,
  Session,
  SessionEvent,
  type SessionRepository,
} from "@nestjs-ai/session";
import { LoggerFactory, StringUtils } from "@nestjs-port/core";
import {
  type DataSource,
  JsdbcTemplate,
  type SqlFragment,
  sql,
} from "@nestjs-port/jsdbc";
import type { JsdbcSessionRepositoryDialect } from "./jsdbc-session-repository-dialect.js";
import { JsdbcSessionRepositoryDialectFactory } from "./jsdbc-session-repository-dialect-factory.js";

const logger = LoggerFactory.getLogger("JsdbcSessionRepository");

/**
 * JSDBC-backed implementation of {@link SessionRepository}.
 *
 * Two tables are required: `AI_SESSION` (session metadata, TTL, metadata JSON,
 * `event_version`) and `AI_SESSION_EVENT` (append-only event log, FK →
 * `AI_SESSION`). Each event's wrapped {@link Message} is stored across
 * `message_type`, `message_content` (plain text), and `message_data` (JSON for
 * tool calls / tool responses).
 *
 * The `event_version` column is incremented atomically on every
 * {@link appendEvent} and {@link replaceEvents}. The compare-and-swap variant of
 * `replaceEvents` issues a conditional `UPDATE ... WHERE event_version = ?` first;
 * when zero rows are updated the swap is abandoned and `false` is returned. All
 * mutating operations run inside a JSDBC transaction.
 */
export class JsdbcSessionRepository implements SessionRepository {
  constructor(
    private readonly template: JsdbcTemplate,
    private readonly dialect: JsdbcSessionRepositoryDialect,
  ) {
    assert(template, "template cannot be null");
    assert(dialect, "dialect cannot be null");
  }

  // -------------------------------------------------------------------------
  // SessionRepository — session lifecycle
  // -------------------------------------------------------------------------

  async save(session: Session): Promise<Session> {
    assert(session != null, "session must not be null");
    await this.template.update(
      this.dialect.getUpsertSessionSql(
        session.id,
        session.userId,
        session.createdAt,
        session.expiresAt,
        this.toJsonOrNull(session.metadata),
      ),
    );
    return session;
  }

  async findById(sessionId: string): Promise<Session | null> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    const rows = await this.template.queryForList(
      sql`SELECT id, user_id, created_at, expires_at, metadata, event_version FROM AI_SESSION WHERE id = ${sessionId}`,
      (row) => this.mapSession(row),
    );
    return rows.length === 0 ? null : rows[0];
  }

  async findByUserId(userId: string): Promise<Session[]> {
    assert(StringUtils.hasText(userId), "userId must not be null or empty");
    return await this.template.queryForList(
      sql`SELECT id, user_id, created_at, expires_at, metadata, event_version FROM AI_SESSION WHERE user_id = ${userId}`,
      (row) => this.mapSession(row),
    );
  }

  async findExpiredSessionIds(before: Date): Promise<string[]> {
    assert(before != null, "before must not be null");
    const rows = await this.template.queryForList(
      sql`SELECT id FROM AI_SESSION WHERE expires_at IS NOT NULL AND expires_at < ${before}`,
    );
    return rows.map((row) => String(column(row, "id")));
  }

  async delete(sessionId: string): Promise<void> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    await this.template.update(
      sql`DELETE FROM AI_SESSION WHERE id = ${sessionId}`,
    );
  }

  // -------------------------------------------------------------------------
  // SessionRepository — event log
  // -------------------------------------------------------------------------

  async appendEvent(event: SessionEvent): Promise<void> {
    assert(event != null, "event must not be null");
    const sessionId = event.sessionId;
    await this.requireSessionExists(sessionId);
    await this.template.transaction(async () => {
      await this.insertEvent(event);
      await this.template.update(
        sql`UPDATE AI_SESSION SET event_version = event_version + 1 WHERE id = ${sessionId}`,
      );
    });
  }

  replaceEvents(sessionId: string, events: SessionEvent[]): Promise<void>;
  replaceEvents(
    sessionId: string,
    events: SessionEvent[],
    expectedVersion: number,
  ): Promise<boolean>;
  async replaceEvents(
    sessionId: string,
    events: SessionEvent[],
    expectedVersion?: number,
  ): Promise<void | boolean> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(events != null, "events must not be null");
    await this.requireSessionExists(sessionId);

    if (expectedVersion === undefined) {
      await this.template.transaction(async () => {
        await this.template.update(
          sql`DELETE FROM AI_SESSION_EVENT WHERE session_id = ${sessionId}`,
        );
        for (const event of events) {
          await this.insertEvent(event);
        }
        await this.template.update(
          sql`UPDATE AI_SESSION SET event_version = event_version + 1 WHERE id = ${sessionId}`,
        );
      });
      return;
    }

    return await this.template.transaction(async () => {
      // Atomically claim the version slot. If another writer already changed it,
      // 0 rows are updated and we bail out without touching the event log.
      const updated = await this.template.update(
        sql`UPDATE AI_SESSION SET event_version = event_version + 1 WHERE id = ${sessionId} AND event_version = ${expectedVersion}`,
      );
      if (updated === 0) {
        return false;
      }
      await this.template.update(
        sql`DELETE FROM AI_SESSION_EVENT WHERE session_id = ${sessionId}`,
      );
      for (const event of events) {
        await this.insertEvent(event);
      }
      return true;
    });
  }

  async getEventVersion(sessionId: string): Promise<number> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    const rows = await this.template.queryForList(
      sql`SELECT event_version FROM AI_SESSION WHERE id = ${sessionId}`,
    );
    return rows.length === 0 ? 0 : toNumber(column(rows[0], "event_version"));
  }

  async findEvents(
    sessionId: string,
    filter: EventFilter,
  ): Promise<SessionEvent[]> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(filter != null, "filter must not be null");

    const fragments: SqlFragment[] = [
      sql`SELECT e.id, e.session_id, e.timestamp, e.message_type, e.message_content, e.message_data, e.synthetic, e.branch, e.metadata FROM AI_SESSION_EVENT e WHERE e.session_id = ${sessionId} `,
    ];

    if (filter.from != null) {
      fragments.push(sql`AND e.timestamp >= ${filter.from} `);
    }
    if (filter.to != null) {
      fragments.push(sql`AND e.timestamp <= ${filter.to} `);
    }
    if (filter.messageTypes != null && filter.messageTypes.size > 0) {
      const names = [...filter.messageTypes].map((mt) => mt.getName());
      fragments.push(sql`AND e.message_type IN (`);
      names.forEach((name, index) => {
        fragments.push(index === 0 ? sql`${name}` : sql`, ${name}`);
      });
      fragments.push(sql`) `);
    }
    if (filter.excludeSynthetic) {
      fragments.push(sql`AND e.synthetic = ${false} `);
    }
    if (filter.branch != null) {
      // Visibility: null branch (root events) OR exact match OR caller is a
      // descendant (filterBranch starts with eventBranch + '.')
      fragments.push(this.dialect.getBranchFilterFragment(filter.branch));
    }
    if (filter.keyword != null) {
      fragments.push(
        this.dialect.getKeywordFilterFragment(`%${filter.keyword}%`),
      );
      fragments.push(sql` `);
    }

    if (filter.lastN != null) {
      fragments.push(sql`ORDER BY e.timestamp DESC LIMIT ${filter.lastN} `);
    } else if (filter.pageSize != null) {
      const page = filter.page != null ? filter.page : 0;
      fragments.push(
        sql`ORDER BY e.timestamp ASC LIMIT ${filter.pageSize} OFFSET ${page * filter.pageSize} `,
      );
    } else {
      fragments.push(sql`ORDER BY e.timestamp ASC `);
    }

    const result = await this.template.queryForList(
      mergeFragments(fragments),
      (row) => this.mapSessionEvent(row),
    );

    if (filter.lastN != null) {
      return [...result].reverse();
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async insertEvent(event: SessionEvent): Promise<void> {
    const message = event.message;
    await this.template.update(
      sql`INSERT INTO AI_SESSION_EVENT (id, session_id, timestamp, message_type, message_content, message_data, synthetic, branch, metadata) VALUES (${event.id}, ${event.sessionId}, ${event.timestamp}, ${message.messageType.getName()}, ${message.text}, ${this.messageDataToJson(message)}, ${event.isSynthetic()}, ${event.branch}, ${this.toJsonOrNull(event.metadata)})`,
    );
  }

  private async requireSessionExists(sessionId: string): Promise<void> {
    const rows = await this.template.queryForList(
      sql`SELECT COUNT(*) AS cnt FROM AI_SESSION WHERE id = ${sessionId}`,
    );
    const count = rows.length === 0 ? 0 : toNumber(column(rows[0], "cnt"));
    if (count === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  private toJsonOrNull(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize value to JSON: ${String(error)}`);
    }
  }

  private fromJsonMap(value: unknown): Record<string, unknown> {
    if (value == null) {
      return {};
    }
    if (typeof value === "object") {
      return value as Record<string, unknown>;
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      return {};
    }
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch (error) {
      logger.warn(
        `Failed to deserialize metadata JSON; returning empty map: ${String(error)}`,
      );
      return {};
    }
  }

  /**
   * Serializes type-specific {@link Message} payload to JSON: an
   * {@link AssistantMessage} with tool calls → JSON array of tool calls; a
   * {@link ToolResponseMessage} → JSON array of tool responses; all other types →
   * `null`.
   */
  private messageDataToJson(message: Message): string | null {
    if (message instanceof AssistantMessage && message.hasToolCalls()) {
      return this.toJsonOrNull(message.toolCalls);
    }
    if (message instanceof ToolResponseMessage) {
      return this.toJsonOrNull(message.responses);
    }
    return null;
  }

  private toMessage(
    type: MessageType,
    content: string | null,
    messageData: string | null,
  ): Message {
    switch (type) {
      case MessageType.USER:
        return new UserMessage({ content: content ?? "" });
      case MessageType.SYSTEM:
        return new SystemMessage({ content: content ?? "" });
      case MessageType.ASSISTANT:
        if (messageData != null && messageData.trim().length > 0) {
          return new AssistantMessage({
            content: content ?? "",
            toolCalls: this.parseToolCalls(messageData),
          });
        }
        return new AssistantMessage({ content: content ?? "" });
      case MessageType.TOOL:
        if (messageData != null && messageData.trim().length > 0) {
          return new ToolResponseMessage({
            responses: this.parseToolResponses(messageData),
          });
        }
        return new ToolResponseMessage({ responses: [] });
      default:
        throw new Error(`Unknown message type: ${type.getName()}`);
    }
  }

  private parseToolCalls(json: string): ToolCall[] {
    try {
      return JSON.parse(json) as ToolCall[];
    } catch (error) {
      logger.warn(
        `Failed to deserialize tool calls from JSON; returning empty list: ${String(error)}`,
      );
      return [];
    }
  }

  private parseToolResponses(json: string): ToolResponse[] {
    try {
      return JSON.parse(json) as ToolResponse[];
    } catch (error) {
      logger.warn(
        `Failed to deserialize tool responses from JSON; returning empty list: ${String(error)}`,
      );
      return [];
    }
  }

  private mapSession(row: Record<string, unknown>): Session {
    return new Session({
      id: String(column(row, "id")),
      userId: String(column(row, "user_id")),
      createdAt: toDate(column(row, "created_at")),
      expiresAt: toDateOrNull(column(row, "expires_at")),
      metadata: this.fromJsonMap(column(row, "metadata")),
    });
  }

  private mapSessionEvent(row: Record<string, unknown>): SessionEvent {
    const messageType = MessageType.valueOf(
      String(column(row, "message_type")),
    );
    const message = this.toMessage(
      messageType,
      (column(row, "message_content") as string | null) ?? null,
      (column(row, "message_data") as string | null) ?? null,
    );

    // Merge the dedicated synthetic column back into the metadata map so that
    // SessionEvent.isSynthetic() returns the correct value.
    const metadata = { ...this.fromJsonMap(column(row, "metadata")) };
    if (toBoolean(column(row, "synthetic"))) {
      metadata[SessionEvent.METADATA_SYNTHETIC] = true;
    }

    return new SessionEvent({
      id: String(column(row, "id")),
      sessionId: String(column(row, "session_id")),
      timestamp: toDate(column(row, "timestamp")),
      message,
      branch: (column(row, "branch") as string | null) ?? null,
      metadata,
    });
  }

  static builder(): JsdbcSessionRepositoryBuilder {
    return new JsdbcSessionRepositoryBuilder();
  }
}

/**
 * Builder for {@link JsdbcSessionRepository}.
 *
 * Minimum required: either {@link dataSource} or {@link jsdbcTemplate}. When the
 * dialect is not set explicitly it is auto-detected from the data source via
 * {@link JsdbcSessionRepositoryDialectFactory}.
 */
export class JsdbcSessionRepositoryBuilder {
  private _dataSource: DataSource | null = null;
  private _jsdbcTemplate: JsdbcTemplate | null = null;
  private _dialect: JsdbcSessionRepositoryDialect | null = null;

  jsdbcTemplate(jsdbcTemplate: JsdbcTemplate): this {
    this._jsdbcTemplate = jsdbcTemplate;
    return this;
  }

  dialect(dialect: JsdbcSessionRepositoryDialect): this {
    this._dialect = dialect;
    return this;
  }

  dataSource(dataSource: DataSource): this {
    this._dataSource = dataSource;
    return this;
  }

  async build(): Promise<JsdbcSessionRepository> {
    const dataSource = this.resolveDataSource();
    const template = this.resolveJdbcTemplate(dataSource);
    const dialect = await this.resolveDialect(dataSource);
    return new JsdbcSessionRepository(template, dialect);
  }

  private resolveJdbcTemplate(dataSource: DataSource): JsdbcTemplate {
    if (this._jsdbcTemplate != null) {
      return this._jsdbcTemplate;
    }
    return new JsdbcTemplate(dataSource);
  }

  private resolveDataSource(): DataSource {
    if (this._dataSource != null) {
      return this._dataSource;
    }
    if (this._jsdbcTemplate != null) {
      return this._jsdbcTemplate.dataSource;
    }
    throw new Error(
      "A DataSource is required — set via dataSource() or jsdbcTemplate()",
    );
  }

  private async resolveDialect(
    dataSource: DataSource,
  ): Promise<JsdbcSessionRepositoryDialect> {
    if (this._dialect != null) {
      await this.warnIfDialectMismatch(dataSource, this._dialect);
      return this._dialect;
    }
    return JsdbcSessionRepositoryDialectFactory.from(dataSource);
  }

  private async warnIfDialectMismatch(
    dataSource: DataSource,
    explicitDialect: JsdbcSessionRepositoryDialect,
  ): Promise<void> {
    const detectedDialect =
      await JsdbcSessionRepositoryDialectFactory.from(dataSource);
    if (detectedDialect.constructor !== explicitDialect.constructor) {
      LoggerFactory.getLogger("JsdbcSessionRepositoryBuilder").warn(
        `Explicitly set dialect ${explicitDialect.constructor.name} will be used instead of detected dialect ${detectedDialect.constructor.name} from datasource`,
      );
    }
  }
}

/**
 * Reads a column value tolerating driver-specific identifier casing.
 */
function column(row: Record<string, unknown>, name: string): unknown {
  if (name in row) {
    return row[name];
  }
  const lower = name.toLowerCase();
  if (lower in row) {
    return row[lower];
  }
  const upper = name.toUpperCase();
  if (upper in row) {
    return row[upper];
  }
  return undefined;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  if (typeof value === "bigint") {
    return new Date(Number(value));
  }
  if (typeof value === "string") {
    return new Date(value);
  }
  throw new Error(`Cannot convert value to Date: ${String(value)}`);
}

function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : toDate(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
}

function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === 1n ||
    value === "1" ||
    value === "true"
  );
}

/**
 * Concatenates a list of {@link SqlFragment}s into a single fragment, preserving
 * the positional bound values. JSDBC's `sql` tag has no native fragment
 * composition, so the dynamic `findEvents` query is assembled by merging the
 * `strings`/`expressions` arrays directly.
 */
function mergeFragments(fragments: SqlFragment[]): SqlFragment {
  const strings: string[] = [""];
  const expressions: unknown[] = [];
  for (const fragment of fragments) {
    strings[strings.length - 1] += fragment.strings[0];
    for (let i = 0; i < fragment.expressions.length; i++) {
      expressions.push(fragment.expressions[i]);
      strings.push(fragment.strings[i + 1] ?? "");
    }
  }
  return {
    strings: Object.assign(strings.slice(), {
      raw: strings.slice(),
    }) as unknown as TemplateStringsArray,
    expressions,
  };
}
