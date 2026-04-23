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

import type { Provider } from "@nestjs/common";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import { createClient, type RedisClientType } from "redis";

import { RedisChatMemoryRepository } from "../redis-chat-memory-repository.js";
import type { RedisChatMemoryProperties } from "./redis-chat-memory-properties.js";

export const REDIS_CHAT_MEMORY_PROPERTIES_TOKEN = Symbol.for(
  "REDIS_CHAT_MEMORY_PROPERTIES_TOKEN",
);

export interface RedisChatMemoryModuleOptions {
  global?: boolean;
}

export interface RedisChatMemoryModuleAsyncOptions {
  global?: boolean;
  useFactory: (
    ...args: never[]
  ) => RedisChatMemoryProperties | Promise<RedisChatMemoryProperties>;
  inject?: unknown[];
}

export class RedisChatMemoryModule {
  static forFeature(
    properties: RedisChatMemoryProperties,
    _options: RedisChatMemoryModuleOptions = {},
  ): Provider[] {
    return RedisChatMemoryModule.forFeatureAsync({
      useFactory: () => properties,
    });
  }

  static forFeatureAsync(
    options: RedisChatMemoryModuleAsyncOptions,
  ): Provider[] {
    return [
      {
        provide: REDIS_CHAT_MEMORY_PROPERTIES_TOKEN,
        useFactory: options.useFactory,
        inject: (options.inject ?? []) as never[],
      },
      ...RedisChatMemoryModule.createChatMemoryProviders(),
    ];
  }

  private static createChatMemoryProviders(): Provider[] {
    return [
      {
        provide: CHAT_MEMORY_TOKEN,
        useFactory: async (
          properties: RedisChatMemoryProperties,
        ): Promise<RedisChatMemoryRepository> => {
          const client = await resolveRedisClient(properties);
          return createRedisChatMemory(properties, client);
        },
        inject: [REDIS_CHAT_MEMORY_PROPERTIES_TOKEN],
      },
    ];
  }
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
