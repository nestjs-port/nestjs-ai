import {
  CHAT_MEMORY_TOKEN,
  type ChatMemoryConfiguration,
} from "@nestjs-ai/commons";
import { createClient, type RedisClientType } from "redis";

import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";
import type { RedisChatMemoryProperties } from "./redis-chat-memory-properties";

export function configureRedisChatMemory(
  properties: RedisChatMemoryProperties,
): ChatMemoryConfiguration {
  return {
    providers: [
      {
        token: CHAT_MEMORY_TOKEN,
        useFactory: async () => {
          const client = await resolveRedisClient(properties);
          return createRedisChatMemory(properties, client);
        },
        inject: [],
      },
    ],
  } as unknown as ChatMemoryConfiguration;
}

async function resolveRedisClient(
  properties: RedisChatMemoryProperties,
): Promise<RedisClientType> {
  const client = properties.client;
  if (client != null) {
    if (client.isOpen) {
      return client;
    }

    await client.connect();
    return client;
  }

  if (properties.clientOptions != null) {
    const createdClient = createClient(
      properties.clientOptions,
    ) as RedisClientType;
    await createdClient.connect();
    return createdClient;
  }

  throw new Error("Redis chat memory client or clientOptions must be set");
}

async function createRedisChatMemory(
  properties: RedisChatMemoryProperties,
  client: RedisClientType,
): Promise<RedisChatMemoryRepository> {
  const builder = RedisChatMemoryRepository.builder().client(client);

  if (properties.indexName != null) {
    builder.indexName(properties.indexName);
  }
  if (properties.keyPrefix != null) {
    builder.keyPrefix(properties.keyPrefix);
  }
  if (properties.timeToLive != null) {
    builder.ttlSeconds(properties.timeToLive);
  }
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.maxConversationIds != null) {
    builder.maxConversationIds(properties.maxConversationIds);
  }
  if (properties.maxMessagesPerConversation != null) {
    builder.maxMessagesPerConversation(properties.maxMessagesPerConversation);
  }
  if (properties.metadataFields != null) {
    builder.metadataFields(properties.metadataFields);
  }

  return builder.build();
}
