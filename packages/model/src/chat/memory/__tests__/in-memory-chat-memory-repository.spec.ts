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
import { describe, expect, it } from "vitest";
import type { Message } from "../../messages";
import { AssistantMessage, UserMessage } from "../../messages";
import { InMemoryChatMemoryRepository } from "../in-memory-chat-memory-repository";

function summarizeMessages(messages: Message[]): Array<{
  messageType: Message["messageType"];
  text: Message["text"];
}> {
  return messages.map((message) => ({
    messageType: message.messageType,
    text: message.text,
  }));
}

describe("InMemoryChatMemoryRepository", () => {
  it("find conversation ids", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId1 = randomUUID();
    const conversationId2 = randomUUID();
    const messages1: Message[] = [new UserMessage({ content: "Hello" })];
    const messages2: Message[] = [
      new AssistantMessage({ content: "Hi there" }),
    ];

    await chatMemoryRepository.saveAll(conversationId1, messages1);
    await chatMemoryRepository.saveAll(conversationId2, messages2);

    const ids = await chatMemoryRepository.findConversationIds();
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([conversationId1, conversationId2]),
    );

    await chatMemoryRepository.deleteByConversationId(conversationId1);
    expect(await chatMemoryRepository.findConversationIds()).toEqual([
      conversationId2,
    ]);
  });

  it("save messages and find multiple messages in conversation", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({ content: "I, Robot" }),
      new UserMessage({ content: "Hello" }),
    ];

    await chatMemoryRepository.saveAll(conversationId, messages);

    expect(
      summarizeMessages(
        await chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages(messages));

    await chatMemoryRepository.deleteByConversationId(conversationId);

    expect(
      await chatMemoryRepository.findByConversationId(conversationId),
    ).toEqual([]);
  });

  it("save messages and find single message in conversation", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const message: Message = new UserMessage({ content: "Hello" });
    const messages: Message[] = [message];

    await chatMemoryRepository.saveAll(conversationId, messages);

    expect(
      summarizeMessages(
        await chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages([message]));

    await chatMemoryRepository.deleteByConversationId(conversationId);

    expect(
      await chatMemoryRepository.findByConversationId(conversationId),
    ).toEqual([]);
  });

  it("find non-existing conversation", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();

    expect(
      await chatMemoryRepository.findByConversationId(conversationId),
    ).toEqual([]);
  });

  it("subsequent save overwrites previous version", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const firstMessages: Message[] = [new UserMessage({ content: "Hello" })];
    const secondMessages: Message[] = [
      new AssistantMessage({ content: "Hi there" }),
    ];

    await chatMemoryRepository.saveAll(conversationId, firstMessages);
    await chatMemoryRepository.saveAll(conversationId, secondMessages);

    expect(
      summarizeMessages(
        await chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages(secondMessages));
  });

  it("null conversation id not allowed", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();

    await expect(
      chatMemoryRepository.saveAll(null as unknown as string, [
        new UserMessage({ content: "Hello" }),
      ]),
    ).rejects.toThrow("conversationId cannot be null or empty");

    await expect(
      chatMemoryRepository.findByConversationId(null as unknown as string),
    ).rejects.toThrow("conversationId cannot be null or empty");

    await expect(
      chatMemoryRepository.deleteByConversationId(null as unknown as string),
    ).rejects.toThrow("conversationId cannot be null or empty");
  });

  it("empty conversation id not allowed", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();

    await expect(
      chatMemoryRepository.saveAll("", [new UserMessage({ content: "Hello" })]),
    ).rejects.toThrow("conversationId cannot be null or empty");

    await expect(chatMemoryRepository.findByConversationId("")).rejects.toThrow(
      "conversationId cannot be null or empty",
    );

    await expect(
      chatMemoryRepository.deleteByConversationId(""),
    ).rejects.toThrow("conversationId cannot be null or empty");
  });

  it("null messages not allowed", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();

    await expect(
      chatMemoryRepository.saveAll(
        conversationId,
        null as unknown as Message[],
      ),
    ).rejects.toThrow("messages cannot be null");
  });

  it("messages with null elements not allowed", async () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const messagesWithNull = [null as unknown as Message];

    await expect(
      chatMemoryRepository.saveAll(conversationId, messagesWithNull),
    ).rejects.toThrow("messages cannot contain null elements");
  });
});
