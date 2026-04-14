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

import { randomUUID } from "node:crypto";
import type { JsdbcTemplate, SqlFragment } from "@nestjs-ai/jsdbc";
import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  MessageType,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import {
  type JsdbcChatMemoryRepositoryDialect,
  JsdbcChatMemoryRepositoryDialectFactory,
} from "@nestjs-ai/model-chat-memory-repository-jsdbc";
import { expect } from "vitest";

/**
 * Shared base suite for JDBC chat memory repository integration tests.
 * Concrete suites can call these methods from Vitest `it` blocks.
 */
export class AbstractJdbcChatMemoryRepositoryIT {
  constructor(
    private readonly chatMemoryRepository: ChatMemoryRepository,
    private readonly jsdbcTemplate: JsdbcTemplate,
  ) {}

  async saveMessagesSingleMessage(
    content: string,
    messageType: MessageType,
  ): Promise<void> {
    const conversationId = randomUUID();
    const message = this.createMessage(
      messageType,
      `${content} - ${conversationId}`,
    );

    await this.chatMemoryRepository.saveAll(conversationId, [message]);

    expect(await this.chatMemoryRepository.findConversationIds()).toContain(
      conversationId,
    );

    const dialect = await this.getDialect();
    const result = await this.jsdbcTemplate.queryForList(
      this.withMetadataColumns(dialect.getSelectMessagesSql(conversationId)),
    );

    expect(result).toHaveLength(1);
    expect(this.normalizeRow(result[0])).toEqual({
      conversation_id: conversationId,
      content: message.text,
      type: messageType.getName(),
      timestamp: expect.anything(),
    });
  }

  async saveMessagesMultipleMessages(): Promise<void> {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant - ${conversationId}`,
      }),
      new UserMessage({ content: `Message from user - ${conversationId}` }),
      new SystemMessage({ content: `Message from system - ${conversationId}` }),
    ];

    await this.chatMemoryRepository.saveAll(conversationId, messages);

    expect(await this.chatMemoryRepository.findConversationIds()).toContain(
      conversationId,
    );

    const dialect = await this.getDialect();
    const results = await this.jsdbcTemplate.queryForList(
      this.withMetadataColumns(dialect.getSelectMessagesSql(conversationId)),
    );

    expect(results).toHaveLength(messages.length);

    for (const [index, message] of messages.entries()) {
      const row = this.normalizeRow(results[index]);

      expect(row).toMatchObject({
        conversation_id: conversationId,
        content: message.text,
        type: message.messageType.getName(),
      });
      expect(row.timestamp).toBeDefined();
    }

    expect(
      await this.chatMemoryRepository.findByConversationId(conversationId),
    ).toHaveLength(messages.length);

    await this.chatMemoryRepository.saveAll(conversationId, [
      new UserMessage({ content: "Hello" }),
    ]);

    expect(
      await this.chatMemoryRepository.findByConversationId(conversationId),
    ).toHaveLength(1);
  }

  async findMessagesByConversationId(): Promise<void> {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant 1 - ${conversationId}`,
      }),
      new AssistantMessage({
        content: `Message from assistant 2 - ${conversationId}`,
      }),
      new UserMessage({ content: `Message from user - ${conversationId}` }),
      new SystemMessage({ content: `Message from system - ${conversationId}` }),
    ];

    await this.chatMemoryRepository.saveAll(conversationId, messages);

    const results =
      await this.chatMemoryRepository.findByConversationId(conversationId);

    expect(results).toHaveLength(messages.length);
    expect(results).toEqual(messages);
  }

  async deleteMessagesByConversationId(): Promise<void> {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant - ${conversationId}`,
      }),
      new UserMessage({ content: `Message from user - ${conversationId}` }),
      new SystemMessage({ content: `Message from system - ${conversationId}` }),
    ];

    await this.chatMemoryRepository.saveAll(conversationId, messages);
    await this.chatMemoryRepository.deleteByConversationId(conversationId);

    expect(
      await this.chatMemoryRepository.findByConversationId(conversationId),
    ).toHaveLength(0);
    expect(await this.chatMemoryRepository.findConversationIds()).not.toContain(
      conversationId,
    );
  }

  async testMessageOrder(): Promise<void> {
    const conversationId = randomUUID();
    const orderedMessages: Message[] = [
      new UserMessage({ content: "1-First message" }),
      new AssistantMessage({ content: "2-Second message" }),
      new UserMessage({ content: "3-Third message" }),
      new SystemMessage({ content: "4-Fourth message" }),
    ];

    await this.chatMemoryRepository.saveAll(conversationId, orderedMessages);

    const retrievedMessages =
      await this.chatMemoryRepository.findByConversationId(conversationId);

    expect(retrievedMessages).toHaveLength(4);
    expect(retrievedMessages.map((message) => message.text)).toEqual([
      "1-First message",
      "2-Second message",
      "3-Third message",
      "4-Fourth message",
    ]);
  }

  async testMessageOrderWithLargeBatch(): Promise<void> {
    const conversationId = randomUUID();
    const messages: Message[] = [];

    for (let i = 0; i < 50; i++) {
      messages.push(new UserMessage({ content: `Message ${i}` }));
    }

    await this.chatMemoryRepository.saveAll(conversationId, messages);

    const retrievedMessages =
      await this.chatMemoryRepository.findByConversationId(conversationId);

    expect(retrievedMessages).toHaveLength(50);
    for (let i = 0; i < 50; i++) {
      expect(retrievedMessages[i]?.text).toBe(`Message ${i}`);
    }
  }

  private createMessage(messageType: MessageType, content: string): Message {
    switch (messageType) {
      case MessageType.ASSISTANT:
        return new AssistantMessage({ content });
      case MessageType.USER:
        return new UserMessage({ content });
      case MessageType.SYSTEM:
        return new SystemMessage({ content });
      default:
        throw new Error("TOOL message type not supported in this test");
    }
  }

  private async getDialect(): Promise<JsdbcChatMemoryRepositoryDialect> {
    return JsdbcChatMemoryRepositoryDialectFactory.from(
      this.jsdbcTemplate.dataSource,
    );
  }

  private withMetadataColumns(fragment: SqlFragment): SqlFragment {
    return {
      strings: [
        fragment.strings[0]?.replace(
          "content, type",
          "conversation_id, content, type, timestamp",
        ) ?? "",
        ...fragment.strings.slice(1),
      ] as unknown as TemplateStringsArray,
      expressions: fragment.expressions,
    };
  }

  private normalizeRow(
    row: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!row) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]),
    );
  }
}
