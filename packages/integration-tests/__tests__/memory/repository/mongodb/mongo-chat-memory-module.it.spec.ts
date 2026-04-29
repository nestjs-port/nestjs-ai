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

import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import { SystemMessage, type ChatMemoryRepository } from "@nestjs-ai/model";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import * as mongodb from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MongoChatMemoryModule } from "../../../../../memory/repository/model-chat-memory-repository-mongodb/src/module/mongo-chat-memory.module.js";
import { MongoChatMemoryRepository } from "../../../../../memory/repository/model-chat-memory-repository-mongodb/src/mongo-chat-memory-repository.js";

describe("MongoChatMemoryModule", () => {
  let mongoDbContainer: StartedMongoDBContainer;
  let mongoClient: mongodb.MongoClient;
  let collection: mongodb.Collection;
  let moduleRef: TestingModule;
  let chatMemoryRepository: ChatMemoryRepository;

  beforeAll(async () => {
    mongoDbContainer = await new MongoDBContainer("mongo:8.0.6").start();
    const connectionString = `${mongoDbContainer.getConnectionString()}${
      mongoDbContainer.getConnectionString().includes("?") ? "&" : "?"
    }directConnection=true`;

    mongoClient = new mongodb.MongoClient(connectionString);
    await mongoClient.connect();
    collection = mongoClient
      .db()
      .collection(MongoChatMemoryRepository.DEFAULT_COLLECTION_NAME);

    moduleRef = await Test.createTestingModule({
      imports: [
        MongoChatMemoryModule.forFeature({
          mongoClient,
          createIndices: true,
        }),
      ],
    }).compile();

    await moduleRef.init();
    chatMemoryRepository = moduleRef.get(CHAT_MEMORY_TOKEN);
  }, 120_000);

  beforeEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongoClient.close();
    await mongoDbContainer.stop();
  }, 60_000);

  it("all methods should execute", async () => {
    const conversationId = randomUUID();
    const systemMessage = new SystemMessage({
      content: "Some system message",
    });

    await chatMemoryRepository.saveAll(conversationId, [systemMessage]);

    await expect(chatMemoryRepository.findConversationIds()).resolves.toContain(
      conversationId,
    );
    await expect(
      chatMemoryRepository.findByConversationId(conversationId),
    ).resolves.toHaveLength(1);

    await chatMemoryRepository.deleteByConversationId(conversationId);

    await expect(
      chatMemoryRepository.findByConversationId(conversationId),
    ).resolves.toHaveLength(0);
  });

  it("indices should be created", async () => {
    const conversationId = randomUUID();
    const systemMessage = new SystemMessage({
      content: "Some system message",
    });

    await chatMemoryRepository.saveAll(conversationId, [systemMessage]);

    const indexes = await collection.indexes();
    expect(indexes).toHaveLength(2);
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: {
            conversationId: 1,
            timestamp: -1,
          },
        }),
      ]),
    );
  });
});
