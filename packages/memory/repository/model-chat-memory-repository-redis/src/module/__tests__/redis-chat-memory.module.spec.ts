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

import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import { createClient, type RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";

import { RedisChatMemoryRepository } from "../../redis-chat-memory-repository";
import {
  REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
  RedisChatMemoryModule,
} from "../redis-chat-memory.module";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

describe("RedisChatMemoryModule", () => {
  describe("forFeature", () => {
    it("uses an already connected redis client directly", async () => {
      const client = createMockRedisClient({ isOpen: true });

      const providers = RedisChatMemoryModule.forFeature({
        client: client as unknown as RedisClientType,
        initializeSchema: false,
        indexName: "custom-chat-memory-index",
        keyPrefix: "memory:",
        maxConversationIds: 50,
        maxMessagesPerConversation: 10,
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      );
      expect(propertiesProvider).toBeDefined();

      const chatMemoryProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === CHAT_MEMORY_TOKEN,
      );
      expect(chatMemoryProvider).toBeDefined();

      const factory = (
        chatMemoryProvider as {
          useFactory: (
            ...args: unknown[]
          ) => Promise<RedisChatMemoryRepository>;
        }
      ).useFactory;

      const chatMemory = await factory({
        client: client as unknown as RedisClientType,
        initializeSchema: false,
        indexName: "custom-chat-memory-index",
        keyPrefix: "memory:",
        maxConversationIds: 50,
        maxMessagesPerConversation: 10,
      });

      expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
      expect(chatMemory.indexName).toBe("custom-chat-memory-index");
      expect(client.connect).not.toHaveBeenCalled();
    });

    it("connects a provided redis client when it is not open", async () => {
      const client = createMockRedisClient({ isOpen: false });

      const providers = RedisChatMemoryModule.forFeature({
        client: client as unknown as RedisClientType,
        initializeSchema: false,
      });

      const chatMemoryProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === CHAT_MEMORY_TOKEN,
      );
      expect(chatMemoryProvider).toBeDefined();

      const factory = (
        chatMemoryProvider as {
          useFactory: (
            ...args: unknown[]
          ) => Promise<RedisChatMemoryRepository>;
        }
      ).useFactory;

      const chatMemory = await factory({
        client: client as unknown as RedisClientType,
        initializeSchema: false,
      });

      expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
      expect(client.connect).toHaveBeenCalled();
    });

    it("creates a redis client from clientOptions", async () => {
      const client = createMockRedisClient();
      const mockedCreateClient = vi.mocked(createClient);
      mockedCreateClient.mockReturnValue(client as never);

      const providers = RedisChatMemoryModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
        initializeSchema: false,
      });

      const chatMemoryProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === CHAT_MEMORY_TOKEN,
      );
      expect(chatMemoryProvider).toBeDefined();

      const factory = (
        chatMemoryProvider as {
          useFactory: (
            ...args: unknown[]
          ) => Promise<RedisChatMemoryRepository>;
        }
      ).useFactory;

      const chatMemory = await factory({
        clientOptions: { url: "redis://localhost:6379" },
        initializeSchema: false,
      });

      expect(mockedCreateClient).toHaveBeenCalledWith({
        url: "redis://localhost:6379",
      });
      expect(client.connect).toHaveBeenCalled();
      expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
    });
  });

  describe("forFeatureAsync", () => {
    it("returns providers with async properties factory", () => {
      const providers = RedisChatMemoryModule.forFeatureAsync({
        useFactory: () => ({
          clientOptions: { url: "redis://localhost:6379" },
          initializeSchema: false,
        }),
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      );
      expect(propertiesProvider).toBeDefined();
      expect(
        (propertiesProvider as { useFactory: unknown }).useFactory,
      ).toBeTypeOf("function");

      const chatMemoryProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === CHAT_MEMORY_TOKEN,
      );
      expect(chatMemoryProvider).toBeDefined();
    });

    it("passes inject tokens to the properties provider", () => {
      const SOME_TOKEN = Symbol("SOME_TOKEN");

      const providers = RedisChatMemoryModule.forFeatureAsync({
        useFactory: (() => ({
          clientOptions: { url: "redis://localhost:6379" },
        })) as never,
        inject: [SOME_TOKEN],
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      ) as { inject: unknown[] };

      expect(propertiesProvider).toBeDefined();
      expect(propertiesProvider.inject).toContain(SOME_TOKEN);
    });
  });
});

function createMockRedisClient(
  options: { isOpen?: boolean } = {},
): RedisClientType & {
  connect: ReturnType<typeof vi.fn>;
  isOpen: boolean;
} {
  return {
    isOpen: options.isOpen ?? false,
    connect: vi.fn(async () => undefined),
  } as unknown as RedisClientType & {
    connect: ReturnType<typeof vi.fn>;
    isOpen: boolean;
  };
}
