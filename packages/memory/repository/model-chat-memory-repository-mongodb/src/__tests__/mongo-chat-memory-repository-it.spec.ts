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

import * as mongodb from "mongodb";
import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AssistantMessage,
  MessageType,
  SystemMessage,
  UserMessage,
  type Message,
} from "@nestjs-ai/model";
import type { Conversation } from "../conversation.js";
import { MongoChatMemoryRepository } from "../mongo-chat-memory-repository.js";

describe("MongoChatMemoryRepositoryIT", () => {
  let mongoDbContainer: StartedMongoDBContainer;
  let mongoClient: mongodb.MongoClient;
  let collection: mongodb.Collection<Conversation>;
  let chatMemoryRepository: MongoChatMemoryRepository;

  beforeAll(async () => {
    mongoDbContainer = await new MongoDBContainer("mongo:8.0.6").start();
    const connectionString = `${mongoDbContainer.getConnectionString()}${
      mongoDbContainer.getConnectionString().includes("?") ? "&" : "?"
    }directConnection=true`;

    mongoClient = new mongodb.MongoClient(connectionString);
    await mongoClient.connect();
    collection = mongoClient
      .db()
      .collection<Conversation>(
        MongoChatMemoryRepository.DEFAULT_COLLECTION_NAME,
      );
  }, 120_000);

  beforeEach(async () => {
    chatMemoryRepository = MongoChatMemoryRepository.builder()
      .collection(collection)
      .build();

    await collection.deleteMany({});
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoDbContainer.stop();
  }, 60_000);

  it("correct chat memory repository instance", () => {
    expect(chatMemoryRepository).toBeInstanceOf(MongoChatMemoryRepository);
  });

  it.each([
    ["Message from assistant", MessageType.ASSISTANT],
    ["Message from user", MessageType.USER],
    ["Message from system", MessageType.SYSTEM],
  ])("save messages single message", async (content, messageType) => {
    const conversationId = randomUUID();
    const message =
      messageType === MessageType.ASSISTANT
        ? new AssistantMessage({
            content: `${content} - ${conversationId}`,
          })
        : messageType === MessageType.USER
          ? new UserMessage({
              content: `${content} - ${conversationId}`,
            })
          : new SystemMessage({
              content: `${content} - ${conversationId}`,
            });

    await chatMemoryRepository.saveAll(conversationId, [message]);

    const result = await collection
      .find({ conversationId })
      .sort({ timestamp: 1 })
      .toArray();

    expect(result).toHaveLength(1);
    expect(result[0]).not.toBeUndefined();

    const conversation = result[0] as Conversation;
    expect(conversation.conversationId).toBe(conversationId);
    expect(conversation.message.content).toBe(message.text);
    expect(conversation.message.type).toBe(messageType.toString());
    expect(conversation.timestamp).toBeInstanceOf(Date);
  });

  it("save multiple messages", async () => {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant - ${conversationId}`,
      }),
      new UserMessage({
        content: `Message from user - ${conversationId}`,
      }),
      new SystemMessage({
        content: `Message from system - ${conversationId}`,
      }),
    ];

    await chatMemoryRepository.saveAll(conversationId, messages);

    const result = await collection
      .find({ conversationId })
      .sort({ timestamp: 1 })
      .toArray();

    expect(result).toHaveLength(messages.length);
  });

  it("find by conversation id", async () => {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant - ${conversationId}`,
      }),
      new UserMessage({
        content: `Message from user - ${conversationId}`,
      }),
      new SystemMessage({
        content: `Message from system - ${conversationId}`,
      }),
    ];

    await chatMemoryRepository.saveAll(conversationId, messages);

    const results =
      await chatMemoryRepository.findByConversationId(conversationId);
    expect(results).toHaveLength(messages.length);
    expect(results).toEqual(messages);
  });

  it("messages are returned in chronological order", async () => {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new UserMessage({ content: "First message" }),
      new AssistantMessage({ content: "Second message" }),
      new UserMessage({ content: "Third message" }),
    ];

    await chatMemoryRepository.saveAll(conversationId, messages);

    const results =
      await chatMemoryRepository.findByConversationId(conversationId);
    expect(results).toEqual(messages);
  });

  it("delete messages by conversation id", async () => {
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({
        content: `Message from assistant - ${conversationId}`,
      }),
      new UserMessage({
        content: `Message from user - ${conversationId}`,
      }),
      new SystemMessage({
        content: `Message from system - ${conversationId}`,
      }),
    ];

    await chatMemoryRepository.saveAll(conversationId, messages);

    await chatMemoryRepository.deleteByConversationId(conversationId);

    const results = await collection.find({ conversationId }).toArray();
    expect(results).toHaveLength(0);
  });
});
