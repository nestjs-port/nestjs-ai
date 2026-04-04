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

describe("RedisChatMemoryModule (forFeature / forFeatureAsync)", () => {
  describe("forFeature", () => {
    it("should return providers array with CHAT_MEMORY_TOKEN", () => {
      const providers = RedisChatMemoryModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
      });

      expect(Array.isArray(providers)).toBe(true);
      expect(
        providers.some(
          (p) =>
            typeof p === "object" &&
            "provide" in p &&
            p.provide === CHAT_MEMORY_TOKEN,
        ),
      ).toBe(true);
    });

    it("should register properties provider", () => {
      const providers = RedisChatMemoryModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
        indexName: "test-memory-index",
        keyPrefix: "test:",
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      ) as { provide: symbol; useValue: RedisChatMemoryProperties } | undefined;

      expect(propertiesProvider).toBeDefined();
      expect(propertiesProvider?.useValue.indexName).toBe("test-memory-index");
      expect(propertiesProvider?.useValue.keyPrefix).toBe("test:");
    });

    it("should pass all configuration properties", () => {
      const properties: RedisChatMemoryProperties = {
        clientOptions: { url: "redis://localhost:6379" },
        indexName: "custom-index",
        keyPrefix: "mem:",
        timeToLive: 3600,
        initializeSchema: true,
        maxConversationIds: 100,
        maxMessagesPerConversation: 50,
      };

      const providers = RedisChatMemoryModule.forFeature(properties);
      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      ) as { provide: symbol; useValue: RedisChatMemoryProperties } | undefined;

      expect(propertiesProvider?.useValue).toEqual(properties);
    });
  });

  describe("forFeatureAsync", () => {
    it("should return providers array with async factory for CHAT_MEMORY_TOKEN", () => {
      const providers = RedisChatMemoryModule.forFeatureAsync({
        useFactory: () => ({
          clientOptions: { url: "redis://localhost:6379" },
        }),
      });

      expect(Array.isArray(providers)).toBe(true);
      expect(
        providers.some(
          (p) =>
            typeof p === "object" &&
            "provide" in p &&
            p.provide === CHAT_MEMORY_TOKEN,
        ),
      ).toBe(true);
    });

    it("should register async properties provider with useFactory", () => {
      const factory = () => ({
        clientOptions: { url: "redis://localhost:6379" } as const,
      });

      const providers = RedisChatMemoryModule.forFeatureAsync({
        useFactory: factory,
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      ) as { provide: symbol; useFactory: unknown } | undefined;

      expect(propertiesProvider).toBeDefined();
      expect(propertiesProvider?.useFactory).toBe(factory);
    });

    it("should support inject tokens for async factory", () => {
      const EXTERNAL_TOKEN = Symbol("EXTERNAL_TOKEN");

      const providers = RedisChatMemoryModule.forFeatureAsync({
        inject: [EXTERNAL_TOKEN],
        useFactory: (_config: unknown) => ({
          clientOptions: { url: "redis://localhost:6379" },
        }),
      });

      const propertiesProvider = providers.find(
        (p) =>
          typeof p === "object" &&
          "provide" in p &&
          p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
      ) as { provide: symbol; inject: unknown[] } | undefined;

      expect(propertiesProvider?.inject).toContain(EXTERNAL_TOKEN);
    });

    it("should support async factory returning a Promise", () => {
      const providers = RedisChatMemoryModule.forFeatureAsync({
        useFactory: async () => ({
          clientOptions: { url: "redis://localhost:6379" },
          indexName: "async-index",
        }),
      });

      expect(
        providers.some(
          (p) =>
            typeof p === "object" &&
            "provide" in p &&
            p.provide === REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
        ),
      ).toBe(true);
    });
  });
});
