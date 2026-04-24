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
import { Test } from "@nestjs/testing";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import {
  REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
  RedisChatMemoryModule,
  type RedisChatMemoryProperties,
} from "@nestjs-ai/model-chat-memory-repository-redis";
import { assert, describe, expect, it, vi } from "vitest";

describe("RedisChatMemoryModule", () => {
  describe("forFeature", () => {
    it("should resolve CHAT_MEMORY_TOKEN via NestJS DI", async () => {
      const client = createMockRedisClient();

      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeature({
            client: client as never,
            initializeSchema: false,
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      assert.exists(chatMemory);
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it("should resolve properties with custom configuration", async () => {
      const client = createMockRedisClient();
      const properties: RedisChatMemoryProperties = {
        client: client as never,
        indexName: "custom-index",
        keyPrefix: "mem:",
        timeToLive: 3600,
        initializeSchema: false,
        maxConversationIds: 100,
        maxMessagesPerConversation: 50,
      };

      const moduleRef = await Test.createTestingModule({
        providers: [...RedisChatMemoryModule.forFeature(properties)],
      }).compile();

      const resolvedProperties = moduleRef.get<RedisChatMemoryProperties>(
        REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      );
      expect(resolvedProperties).toEqual(properties);

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      assert.exists(chatMemory);
      expect(client.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve CHAT_MEMORY_TOKEN from async factory via NestJS DI", async () => {
      const client = createMockRedisClient();

      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeatureAsync({
            useFactory: () => ({
              client: client as never,
              initializeSchema: false,
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      assert.exists(chatMemory);
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it("should support inject tokens for async factory", async () => {
      const EXTERNAL_TOKEN = Symbol("EXTERNAL_TOKEN");
      const client = createMockRedisClient();

      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: EXTERNAL_TOKEN,
            useValue: { client },
          },
          ...RedisChatMemoryModule.forFeatureAsync({
            inject: [EXTERNAL_TOKEN],
            useFactory: (config: { client: unknown }) => ({
              client: config.client as never,
              initializeSchema: false,
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      assert.exists(chatMemory);
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it("should support async factory returning a Promise", async () => {
      const client = createMockRedisClient();

      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeatureAsync({
            useFactory: async () => ({
              client: client as never,
              indexName: "async-index",
              initializeSchema: false,
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      assert.exists(chatMemory);
      expect(client.connect).toHaveBeenCalledTimes(1);
    });
  });
});

function createMockRedisClient() {
  return {
    isOpen: false,
    connect: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    ft: {
      _list: vi.fn(async () => []),
      create: vi.fn(async () => "OK"),
      info: vi.fn(async () => ({})),
      search: vi.fn(async () => ({ documents: [] })),
      aggregate: vi.fn(async () => ({ results: [] })),
    },
    json: {
      set: vi.fn(async () => "OK"),
      get: vi.fn(async () => null),
    },
    expire: vi.fn(async () => 1),
    del: vi.fn(async () => 1),
  };
}
