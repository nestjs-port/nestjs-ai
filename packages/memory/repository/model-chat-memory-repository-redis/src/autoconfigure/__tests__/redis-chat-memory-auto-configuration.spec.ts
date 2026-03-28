import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import { createClient, type RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";

import { RedisChatMemoryRepository } from "../../redis-chat-memory-repository";
import { configureRedisChatMemory } from "../redis-chat-memory-auto-configuration";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

describe("configureRedisChatMemory", () => {
  it("uses an already connected redis client directly", async () => {
    const client = createMockRedisClient({ isOpen: true });

    const configuration = configureRedisChatMemory({
      client: client as unknown as RedisClientType,
      initializeSchema: false,
      indexName: "custom-chat-memory-index",
      keyPrefix: "memory:",
      maxConversationIds: 50,
      maxMessagesPerConversation: 10,
    });

    const chatMemoryProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === CHAT_MEMORY_TOKEN,
    );

    expect(chatMemoryProvider).toBeDefined();

    const chatMemory = await (
      chatMemoryProvider as unknown as {
        useFactory: () => Promise<RedisChatMemoryRepository>;
      }
    ).useFactory();

    expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
    expect(chatMemory.indexName).toBe("custom-chat-memory-index");
    expect(client.connect).not.toHaveBeenCalled();
  });

  it("connects a provided redis client when it is not open", async () => {
    const client = createMockRedisClient({ isOpen: false });

    const configuration = configureRedisChatMemory({
      client: client as unknown as RedisClientType,
      initializeSchema: false,
    });

    const chatMemoryProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === CHAT_MEMORY_TOKEN,
    );

    expect(chatMemoryProvider).toBeDefined();

    const chatMemory = await (
      chatMemoryProvider as unknown as {
        useFactory: () => Promise<RedisChatMemoryRepository>;
      }
    ).useFactory();

    expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
    expect(client.connect).toHaveBeenCalled();
  });

  it("creates a redis client from clientOptions", async () => {
    const client = createMockRedisClient();
    const mockedCreateClient = vi.mocked(createClient);
    mockedCreateClient.mockReturnValue(client as never);

    const configuration = configureRedisChatMemory({
      clientOptions: { url: "redis://localhost:6379" },
      initializeSchema: false,
    });

    const chatMemoryProvider = configuration.providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === CHAT_MEMORY_TOKEN,
    );

    expect(chatMemoryProvider).toBeDefined();

    const chatMemory = await (
      chatMemoryProvider as unknown as {
        useFactory: () => Promise<RedisChatMemoryRepository>;
      }
    ).useFactory();

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
    });
    expect(client.connect).toHaveBeenCalled();
    expect(chatMemory).toBeInstanceOf(RedisChatMemoryRepository);
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
