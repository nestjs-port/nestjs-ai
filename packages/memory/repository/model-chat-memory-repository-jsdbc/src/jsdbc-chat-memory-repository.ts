/*
 * Copyright 2026-present the original author or authors.
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
import { LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import {
  type DataSource,
  JsdbcTemplate,
  SingleColumnRowMapper,
} from "@nestjs-ai/jsdbc";
import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  MessageType,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { JsdbcChatMemoryRepositoryDialect } from "./jsdbc-chat-memory-repository-dialect";

export class JsdbcChatMemoryRepository implements ChatMemoryRepository {
  constructor(
    private readonly template: JsdbcTemplate,
    private readonly dialect: JsdbcChatMemoryRepositoryDialect,
  ) {
    assert(template, "template cannot be null");
    assert(dialect, "dialect cannot be null");
  }

  async findConversationIds(): Promise<string[]> {
    return await this.template.queryForList(
      this.dialect.getSelectConversationIdsSql(),
      new SingleColumnRowMapper(String, { nullable: false }),
    );
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );

    const rows = await this.template.queryForList(
      this.dialect.getSelectMessagesSql(conversationId),
    );
    return rows.map((row) => this.toMessage(row));
  }

  async saveAll(conversationId: string, messages: Message[]): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    assert(messages != null, "messages cannot be null");
    for (const message of messages) {
      assert(message != null, "messages cannot contain null elements");
    }

    await this.template.transaction(async () => {
      await this.template.update(
        this.dialect.getDeleteMessagesSql(conversationId),
      );

      // Use second-level granularity to ensure compatibility with all database
      // timestamp precisions. The timestamp serves as a sequence number for
      // message ordering, not as a precise temporal record.
      let sequenceId = Math.floor(Date.now() / 1000);
      for (const message of messages) {
        const messageType = String(message.messageType.getName());
        await this.template.update(
          this.dialect.getInsertMessageSql(
            conversationId,
            message.text,
            messageType,
            new Date(sequenceId++ * 1000),
          ),
        );
      }
    });
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );

    await this.template.update(
      this.dialect.getDeleteMessagesSql(conversationId),
    );
  }

  static builder(): JsdbcChatMemoryRepositoryBuilder {
    return new JsdbcChatMemoryRepositoryBuilder();
  }

  private toMessage(row: Record<string, unknown>): Message {
    const content = this.getRowValue(row, ["content", "CONTENT"]);
    const type = this.getRowValue(row, ["type", "TYPE"]);

    assert(
      typeof type === "string" && StringUtils.hasText(type),
      "message type cannot be null or empty",
    );

    switch (this.toMessageType(type)) {
      case MessageType.USER:
        assert(
          typeof content === "string",
          "content cannot be null for USER messages",
        );
        return new UserMessage({ content, properties: {} });
      case MessageType.ASSISTANT:
        return new AssistantMessage({
          content: typeof content === "string" ? content : null,
          properties: {},
        });
      case MessageType.SYSTEM:
        assert(
          typeof content === "string",
          "content cannot be null for SYSTEM messages",
        );
        return new SystemMessage({ content, properties: {} });
      case MessageType.TOOL:
        // The content is always stored empty for ToolResponseMessages.
        // If we want to capture the actual content, we need to extend
        // message persistence to support it.
        return new ToolResponseMessage({ responses: [] });
      default:
        throw new Error(`Unknown message type: ${String(type)}`);
    }
  }

  private toMessageType(value: string): MessageType {
    switch (value) {
      case MessageType.USER.getName():
        return MessageType.USER;
      case MessageType.ASSISTANT.getName():
        return MessageType.ASSISTANT;
      case MessageType.SYSTEM.getName():
        return MessageType.SYSTEM;
      case MessageType.TOOL.getName():
        return MessageType.TOOL;
      default:
        throw new Error(`Unknown message type: ${value}`);
    }
  }

  private getRowValue(
    row: Record<string, unknown>,
    keys: readonly string[],
  ): unknown {
    for (const key of keys) {
      if (Object.hasOwn(row, key)) {
        return row[key];
      }
    }

    return undefined;
  }
}

export class JsdbcChatMemoryRepositoryBuilder {
  private _dataSource: DataSource | null = null;
  private _dialect: JsdbcChatMemoryRepositoryDialect | null = null;

  dialect(dialect: JsdbcChatMemoryRepositoryDialect): this {
    this._dialect = dialect;
    return this;
  }

  dataSource(dataSource: DataSource): this {
    this._dataSource = dataSource;
    return this;
  }

  async build(): Promise<JsdbcChatMemoryRepository> {
    const dataSource = this.resolveDataSource();
    const template = new JsdbcTemplate(dataSource);
    const dialect = await this.resolveDialect(template);
    return new JsdbcChatMemoryRepository(template, dialect);
  }

  private resolveDataSource(): DataSource {
    if (this._dataSource != null) {
      return this._dataSource;
    }

    throw new Error("DataSource must be set via dataSource()");
  }

  private async resolveDialect(
    template: JsdbcTemplate,
  ): Promise<JsdbcChatMemoryRepositoryDialect> {
    if (this._dialect != null) {
      await this.warnIfDialectMismatch(template, this._dialect);
      return this._dialect;
    }

    return JsdbcChatMemoryRepositoryDialect.from(template.dataSource);
  }

  private async warnIfDialectMismatch(
    template: JsdbcTemplate,
    explicitDialect: JsdbcChatMemoryRepositoryDialect,
  ): Promise<void> {
    const detectedDialect = await JsdbcChatMemoryRepositoryDialect.from(
      template.dataSource,
    );
    if (detectedDialect.constructor !== explicitDialect.constructor) {
      LoggerFactory.getLogger(JsdbcChatMemoryRepositoryBuilder.name).warn(
        "Explicitly set dialect {} will be used instead of detected dialect {} from datasource",
        explicitDialect.constructor.name,
        detectedDialect.constructor.name,
      );
    }
  }
}
