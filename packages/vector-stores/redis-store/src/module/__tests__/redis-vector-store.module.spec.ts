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

import type { FactoryProvider, ValueProvider } from "@nestjs/common";
import { VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { createClient, type RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";

import { RedisMetadataField } from "../../redis-metadata-field";
import {
  RedisDistanceMetric,
  RedisVectorStore,
} from "../../redis-vector-store";
import {
  REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
  RedisVectorStoreModule,
} from "../redis-vector-store.module";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

describe("RedisVectorStoreModule", () => {
  it("registers vector store provider via forFeature", () => {
    const dynamicModule = RedisVectorStoreModule.forFeature({
      clientOptions: { url: "redis://localhost:6379" },
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === VECTOR_STORE_TOKEN)).toBe(true);
    expect(
      providers.some((p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN),
    ).toBe(true);
  });

  it("injects properties via REDIS_VECTOR_STORE_PROPERTIES_TOKEN", () => {
    const dynamicModule = RedisVectorStoreModule.forFeature({
      clientOptions: { url: "redis://localhost:6379" },
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const vectorStoreProvider = providers.find(
      (p) => p.provide === VECTOR_STORE_TOKEN,
    ) as FactoryProvider;

    expect(vectorStoreProvider.inject).toContain(
      REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
    );
  });

  it("exports feature providers but not the properties token", () => {
    const dynamicModule = RedisVectorStoreModule.forFeature({
      clientOptions: { url: "redis://localhost:6379" },
    });
    const exports = dynamicModule.exports as symbol[];

    expect(exports).toContain(VECTOR_STORE_TOKEN);
    expect(exports).not.toContain(REDIS_VECTOR_STORE_PROPERTIES_TOKEN);
  });

  it("creates RedisVectorStore from properties with an already connected client", async () => {
    const client = createMockRedisClient({ isOpen: true });
    const embeddingModel = createMockEmbeddingModel();

    const dynamicModule = RedisVectorStoreModule.forFeature({
      client: client as unknown as RedisClientType,
      initializeSchema: true,
      indexName: "custom-index",
      prefix: "doc:",
      distanceMetric: RedisDistanceMetric.L2,
      metadataFields: [RedisMetadataField.tag("type")],
      hnsw: {
        m: 32,
        efConstruction: 100,
        efRuntime: 50,
      },
    });

    const providers = dynamicModule.providers as FactoryProvider[];
    const vectorStoreProvider = providers.find(
      (p) => p.provide === VECTOR_STORE_TOKEN,
    ) as FactoryProvider;

    const properties = (
      providers.find(
        (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
      ) as unknown as ValueProvider
    ).useValue;

    const vectorStore = await (
      vectorStoreProvider.useFactory as (
        properties: unknown,
        embeddingModel: EmbeddingModel,
      ) => Promise<RedisVectorStore>
    )(properties, embeddingModel);

    expect(vectorStore).toBeInstanceOf(RedisVectorStore);
    expect(vectorStore.redisClient).toBe(client);
    expect(vectorStore.distanceMetric).toBe(RedisDistanceMetric.L2);

    await vectorStore.onModuleInit();

    expect(client.ft.create).toHaveBeenCalledWith(
      "custom-index",
      expect.any(Object),
      expect.objectContaining({
        ON: "JSON",
        PREFIX: "doc:",
      }),
    );
    expect(client.connect).not.toHaveBeenCalled();
  });

  it("connects a provided redis client when it is not open", async () => {
    const client = createMockRedisClient({ isOpen: false });
    const embeddingModel = createMockEmbeddingModel();

    const dynamicModule = RedisVectorStoreModule.forFeature({
      client: client as unknown as RedisClientType,
      initializeSchema: false,
    });

    const providers = dynamicModule.providers as FactoryProvider[];
    const vectorStoreProvider = providers.find(
      (p) => p.provide === VECTOR_STORE_TOKEN,
    ) as FactoryProvider;

    const properties = (
      providers.find(
        (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
      ) as unknown as ValueProvider
    ).useValue;

    const vectorStore = await (
      vectorStoreProvider.useFactory as (
        properties: unknown,
        embeddingModel: EmbeddingModel,
      ) => Promise<RedisVectorStore>
    )(properties, embeddingModel);

    expect(vectorStore).toBeInstanceOf(RedisVectorStore);
    expect(vectorStore.redisClient).toBe(client);
    expect(client.connect).toHaveBeenCalled();
  });

  it("creates a redis client from clientOptions", async () => {
    const client = createMockRedisClient();
    const mockedCreateClient = vi.mocked(createClient);
    mockedCreateClient.mockReturnValue(
      client as unknown as ReturnType<typeof createClient>,
    );

    const dynamicModule = RedisVectorStoreModule.forFeature({
      clientOptions: { url: "redis://localhost:6379" },
    });

    const providers = dynamicModule.providers as FactoryProvider[];
    const vectorStoreProvider = providers.find(
      (p) => p.provide === VECTOR_STORE_TOKEN,
    ) as FactoryProvider;

    const properties = (
      providers.find(
        (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
      ) as unknown as ValueProvider
    ).useValue;

    const vectorStore = await (
      vectorStoreProvider.useFactory as (
        properties: unknown,
        embeddingModel: EmbeddingModel,
      ) => Promise<RedisVectorStore>
    )(properties, createMockEmbeddingModel());

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
    });
    expect(client.connect).toHaveBeenCalled();
    expect(vectorStore.redisClient).toBe(client);
  });

  it("registers async properties provider via forFeatureAsync", () => {
    const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
      useFactory: () => ({
        clientOptions: { url: "redis://localhost:6379" },
      }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const propertiesProvider = providers.find(
      (p) => p.provide === REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
    ) as FactoryProvider;

    expect(propertiesProvider).toBeDefined();
    expect(propertiesProvider.useFactory).toBeDefined();
  });

  it("defaults global to false for forFeature", () => {
    const dynamicModule = RedisVectorStoreModule.forFeature({
      clientOptions: { url: "redis://localhost:6379" },
    });

    expect(dynamicModule.global).toBe(false);
  });

  it("supports global option for forFeature", () => {
    const dynamicModule = RedisVectorStoreModule.forFeature(
      { clientOptions: { url: "redis://localhost:6379" } },
      { global: true },
    );

    expect(dynamicModule.global).toBe(true);
  });

  it("defaults global to false for forFeatureAsync", () => {
    const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
      useFactory: () => ({
        clientOptions: { url: "redis://localhost:6379" },
      }),
    });

    expect(dynamicModule.global).toBe(false);
  });

  it("supports global option for forFeatureAsync", () => {
    const dynamicModule = RedisVectorStoreModule.forFeatureAsync({
      useFactory: () => ({
        clientOptions: { url: "redis://localhost:6379" },
      }),
      global: true,
    });

    expect(dynamicModule.global).toBe(true);
  });
});

function createMockRedisClient(
  options: { isOpen?: boolean } = {},
): RedisClientType & {
  connect: ReturnType<typeof vi.fn>;
  isOpen: boolean;
  ft: {
    _list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
} {
  return {
    isOpen: options.isOpen ?? false,
    connect: vi.fn(async () => undefined),
    ft: {
      _list: vi.fn(async () => []),
      create: vi.fn(async () => "OK"),
    },
  } as unknown as RedisClientType & {
    connect: ReturnType<typeof vi.fn>;
    ft: {
      _list: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
}

function createMockEmbeddingModel(): EmbeddingModel {
  return {
    embed: vi.fn(),
    dimensions: vi.fn(async () => 8),
  } as unknown as EmbeddingModel;
}
