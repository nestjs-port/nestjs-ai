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
import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  MessageType,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory, StringUtils } from "@nestjs-port/core";
import {
  type DataSource,
  JsdbcTemplate,
  type RowMapper,
  SingleColumnRowMapper,
} from "@nestjs-port/jsdbc";
import type { JsdbcChatMemoryRepositoryDialect } from "./jsdbc-chat-memory-repository-dialect.js";
import { JsdbcChatMemoryRepositoryDialectFactory } from "./jsdbc-chat-memory-repository-dialect-factory.js";

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

    return await this.template.queryForList(
      this.dialect.getSelectMessagesSql(conversationId),
      new MessageRowMapper(),
    );
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
}

class MessageRowMapper implements RowMapper<Message> {
  mapRow(row: Record<string, unknown>, rowNum: number): Message {
    return this.toMessage(this.validateRow(row, rowNum));
  }

  private validateRow(
    row: Record<string, unknown>,
    rowNum: number,
  ): MessageRow {
    const content = row.content;
    if (typeof content !== "string") {
      throw new Error(`Invalid message content at row ${rowNum}`);
    }

    const type = row.type;
    if (typeof type !== "string") {
      throw new Error(`Invalid message type at row ${rowNum}`);
    }

    return { content, type };
  }

  private toMessage(row: MessageRow): Message {
    assert(
      StringUtils.hasText(row.type),
      "message type cannot be null or empty",
    );

    switch (MessageType.valueOf(row.type)) {
      case MessageType.USER:
        return new UserMessage({ content: row.content });
      case MessageType.ASSISTANT:
        return new AssistantMessage({ content: row.content });
      case MessageType.SYSTEM:
        return new SystemMessage({ content: row.content });
      case MessageType.TOOL:
        // The content is always stored empty for ToolResponseMessages.
        // If we want to capture the actual content, we need to extend
        // message persistence to support it.
        return new ToolResponseMessage({ responses: [] });
      default:
        throw new Error(`Unknown message type: ${String(row.type)}`);
    }
  }
}

interface MessageRow {
  content: string;
  type: string;
}

export class JsdbcChatMemoryRepositoryBuilder {
  private _dataSource: DataSource | null = null;
  private _jsdbcTemplate: JsdbcTemplate | null = null;
  private _dialect: JsdbcChatMemoryRepositoryDialect | null = null;

  jsdbcTemplate(jsdbcTemplate: JsdbcTemplate): this {
    this._jsdbcTemplate = jsdbcTemplate;
    return this;
  }

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
    const template = this.resolveJdbcTemplate(dataSource);
    const dialect = await this.resolveDialect(dataSource);
    return new JsdbcChatMemoryRepository(template, dialect);
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
      "DataSource must be set via dataSource() or jsdbcTemplate()",
    );
  }

  private async resolveDialect(
    dataSource: DataSource,
  ): Promise<JsdbcChatMemoryRepositoryDialect> {
    if (this._dialect != null) {
      await this.warnIfDialectMismatch(dataSource, this._dialect);
      return this._dialect;
    }

    return JsdbcChatMemoryRepositoryDialectFactory.from(dataSource);
  }

  private async warnIfDialectMismatch(
    dataSource: DataSource,
    explicitDialect: JsdbcChatMemoryRepositoryDialect,
  ): Promise<void> {
    const detectedDialect =
      await JsdbcChatMemoryRepositoryDialectFactory.from(dataSource);
    if (detectedDialect.constructor !== explicitDialect.constructor) {
      LoggerFactory.getLogger(JsdbcChatMemoryRepositoryBuilder.name).warn(
        "Explicitly set dialect {} will be used instead of detected dialect {} from datasource",
        explicitDialect.constructor.name,
        detectedDialect.constructor.name,
      );
    }
  }
}
