import { VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { createClient, type RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";

import { RedisMetadataField } from "../../redis-metadata-field";
import {
  RedisDistanceMetric,
  RedisVectorStore,
} from "../../redis-vector-store";
import { configureRedisVectorStore } from "../redis-vector-store-auto-configuration";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

describe("configureRedisVectorStore", () => {
  it("uses an already connected redis client directly", async () => {
    const client = createMockRedisClient({ isOpen: true });
    const embeddingModel = createMockEmbeddingModel();

    const configuration = configureRedisVectorStore({
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

    const vectorStoreProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === VECTOR_STORE_TOKEN,
    );

    expect(vectorStoreProvider).toBeDefined();

    const vectorStore = await (
      vectorStoreProvider as unknown as {
        useFactory: (
          embeddingModel: EmbeddingModel,
        ) => Promise<RedisVectorStore>;
      }
    ).useFactory(embeddingModel);

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

    const configuration = configureRedisVectorStore({
      client: client as unknown as RedisClientType,
      initializeSchema: false,
    });

    const vectorStoreProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === VECTOR_STORE_TOKEN,
    );

    expect(vectorStoreProvider).toBeDefined();

    const vectorStore = await (
      vectorStoreProvider as unknown as {
        useFactory: (
          embeddingModel: EmbeddingModel,
        ) => Promise<RedisVectorStore>;
      }
    ).useFactory(embeddingModel);

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

    const configuration = configureRedisVectorStore({
      clientOptions: { url: "redis://localhost:6379" },
    });

    const vectorStoreProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === VECTOR_STORE_TOKEN,
    );

    expect(vectorStoreProvider).toBeDefined();

    const vectorStore = await (
      vectorStoreProvider as unknown as {
        useFactory: (
          embeddingModel: EmbeddingModel,
        ) => Promise<RedisVectorStore>;
      }
    ).useFactory(createMockEmbeddingModel());

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
    });
    expect(client.connect).toHaveBeenCalled();
    expect(vectorStore.redisClient).toBe(client);
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
