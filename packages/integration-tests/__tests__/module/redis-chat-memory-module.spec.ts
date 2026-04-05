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
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import {
  REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
  RedisChatMemoryModule,
  type RedisChatMemoryProperties,
} from "@nestjs-ai/model-chat-memory-repository-redis";
import { describe, expect, it, vi } from "vitest";

vi.mock("redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("redis")>();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      isOpen: false,
      connect: vi.fn(async () => undefined),
      ft: {
        _list: vi.fn(async () => []),
        create: vi.fn(async () => "OK"),
        info: vi.fn(async () => ({})),
      },
      json: {
        set: vi.fn(async () => "OK"),
        get: vi.fn(async () => null),
      },
    })),
  };
});

const REDIS_CONFIG_TOKEN = Symbol("REDIS_CONFIG_TOKEN");

@Module({
  providers: [
    {
      provide: REDIS_CONFIG_TOKEN,
      useValue: {
        clientOptions: { url: "redis://localhost:6379" },
        indexName: "async-index",
      },
    },
  ],
  exports: [REDIS_CONFIG_TOKEN],
})
class RedisConfigModule {}

describe("RedisChatMemoryModule", () => {
  describe("forFeature", () => {
    it("should resolve CHAT_MEMORY_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeature({
            clientOptions: { url: "redis://localhost:6379" },
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      expect(chatMemory).toBeDefined();
    });

    it("should resolve properties with custom configuration", async () => {
      const properties: RedisChatMemoryProperties = {
        clientOptions: { url: "redis://localhost:6379" },
        indexName: "custom-index",
        keyPrefix: "mem:",
        timeToLive: 3600,
        initializeSchema: true,
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
      expect(chatMemory).toBeDefined();
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve CHAT_MEMORY_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeatureAsync({
            useFactory: () => ({
              clientOptions: { url: "redis://localhost:6379" },
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      expect(chatMemory).toBeDefined();
    });

    it("should support inject tokens for async factory", async () => {
      const EXTERNAL_TOKEN = Symbol("EXTERNAL_TOKEN");

      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: EXTERNAL_TOKEN,
            useValue: { url: "redis://localhost:6379" },
          },
          ...RedisChatMemoryModule.forFeatureAsync({
            inject: [EXTERNAL_TOKEN],
            useFactory: (config: { url: string }) => ({
              clientOptions: { url: config.url },
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      expect(chatMemory).toBeDefined();
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          ...RedisChatMemoryModule.forFeatureAsync({
            useFactory: async () => ({
              clientOptions: { url: "redis://localhost:6379" },
              indexName: "async-index",
            }),
          }),
        ],
      }).compile();

      const chatMemory = await moduleRef.resolve(CHAT_MEMORY_TOKEN);
      expect(chatMemory).toBeDefined();
    });
  });
});
