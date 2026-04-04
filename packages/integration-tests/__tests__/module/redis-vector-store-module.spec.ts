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
import { VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import { TransformersEmbeddingModelModule } from "@nestjs-ai/model-transformers";
import { NestAiModule } from "@nestjs-ai/platform";
import {
  REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
  RedisVectorStoreModule,
  type RedisVectorStoreProperties,
} from "@nestjs-ai/vector-store-redis";
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
        indexName: "test-index",
      },
    },
  ],
  exports: [REDIS_CONFIG_TOKEN],
})
class RedisConfigModule {}

describe("RedisVectorStoreModule (forFeature / forFeatureAsync)", () => {
  describe("forFeature", () => {
    it("should register VECTOR_STORE_TOKEN provider", () => {
      const dynamicModule = RedisVectorStoreModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
      });
      const providers = dynamicModule.providers as { provide: unknown }[];

      expect(providers.some((p) => p.provide === VECTOR_STORE_TOKEN)).toBe(
        true,
      );
      expect(
        providers.some(
          (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
        ),
      ).toBe(true);
    });

    it("should not export properties token", () => {
      const dynamicModule = RedisVectorStoreModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
      });
      const exports = dynamicModule.exports as symbol[];

      expect(exports).toContain(VECTOR_STORE_TOKEN);
      expect(exports).not.toContain(REDIS_VECTOR_STORE_PROPERTIES_TOKEN);
    });

    it("should resolve VECTOR_STORE_TOKEN via NestJS DI with embedding model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          RedisVectorStoreModule.forFeature({
            clientOptions: { url: "redis://localhost:6379" },
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      expect(vectorStore).toBeDefined();
    });

    it("should default global to false", () => {
      const dynamicModule = RedisVectorStoreModule.forFeature({
        clientOptions: { url: "redis://localhost:6379" },
      });
      expect(dynamicModule.global).toBe(false);
    });

    it("should support global option", () => {
      const dynamicModule = RedisVectorStoreModule.forFeature(
        { clientOptions: { url: "redis://localhost:6379" } },
        { global: true },
      );
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should register async properties provider", () => {
      const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
        useFactory: () => ({
          clientOptions: { url: "redis://localhost:6379" },
        }),
      });
      const providers = dynamicModule.providers as { provide: unknown }[];

      const propertiesProvider = providers.find(
        (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
      ) as { useFactory?: unknown };

      expect(propertiesProvider).toBeDefined();
      expect(propertiesProvider.useFactory).toBeDefined();
    });

    it("should resolve VECTOR_STORE_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          RedisVectorStoreModule.forFeatureAsync({
            useFactory: () => ({
              clientOptions: { url: "redis://localhost:6379" },
            }),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      expect(vectorStore).toBeDefined();
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          RedisVectorStoreModule.forFeatureAsync({
            imports: [RedisConfigModule],
            inject: [REDIS_CONFIG_TOKEN],
            useFactory: (
              config: RedisVectorStoreProperties,
            ): RedisVectorStoreProperties => config,
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      expect(vectorStore).toBeDefined();
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          RedisVectorStoreModule.forFeatureAsync({
            useFactory: async () => ({
              clientOptions: { url: "redis://localhost:6379" },
            }),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      expect(vectorStore).toBeDefined();
    });

    it("should default global to false for async", () => {
      const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
        useFactory: () => ({
          clientOptions: { url: "redis://localhost:6379" },
        }),
      });
      expect(dynamicModule.global).toBe(false);
    });

    it("should support global option for async", () => {
      const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
        useFactory: () => ({
          clientOptions: { url: "redis://localhost:6379" },
        }),
        global: true,
      });
      expect(dynamicModule.global).toBe(true);
    });
  });
});
