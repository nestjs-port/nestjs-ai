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

import assert from "node:assert/strict";

import {
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import type { Collection, IndexDescriptionInfo } from "mongodb";

import { MongoChatMemoryRepository } from "../mongo-chat-memory-repository.js";
import type { Conversation } from "../conversation.js";
import type { MongoChatMemoryProperties } from "./mongo-chat-memory-properties.js";

export const MONGO_CHAT_MEMORY_PROPERTIES_TOKEN = Symbol.for(
  "MONGO_CHAT_MEMORY_PROPERTIES_TOKEN",
);

export interface MongoChatMemoryModuleOptions {
  imports?: ModuleMetadata["imports"];
  global?: boolean;
}

export interface MongoChatMemoryModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<MongoChatMemoryProperties> | MongoChatMemoryProperties;
  global?: boolean;
}

@Module({})
export class MongoChatMemoryModule {
  static forFeature(
    properties: MongoChatMemoryProperties = {},
    options?: MongoChatMemoryModuleOptions,
  ): DynamicModule {
    return MongoChatMemoryModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: MongoChatMemoryModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: MongoChatMemoryModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MONGO_CHAT_MEMORY_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map(
        (provider) => (provider as FactoryProvider).provide,
      ),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: CHAT_MEMORY_TOKEN,
      useFactory: async (
        properties: MongoChatMemoryProperties,
      ): Promise<MongoChatMemoryRepository> => {
        const collection = await resolveCollection(properties);

        if (properties.createIndices) {
          await initializeIndices(collection, properties.ttl);
        }

        return MongoChatMemoryRepository.builder()
          .collection(collection)
          .build();
      },
      inject: [MONGO_CHAT_MEMORY_PROPERTIES_TOKEN],
    },
  ];
}

async function resolveCollection(
  properties: MongoChatMemoryProperties,
): Promise<Collection<Conversation>> {
  if (properties.collection != null) {
    return properties.collection;
  }

  const collectionName =
    properties.collectionName ??
    MongoChatMemoryRepository.DEFAULT_COLLECTION_NAME;

  if (properties.db != null) {
    return properties.db.collection<Conversation>(collectionName);
  }

  if (properties.mongoClient != null) {
    await properties.mongoClient.connect();
    return properties.mongoClient.db().collection<Conversation>(collectionName);
  }

  throw new Error("collection, db, or mongoClient must be provided");
}

async function initializeIndices(
  collection: Collection<Conversation>,
  ttl?: number | null,
): Promise<void> {
  await createMainIndex(collection);

  if (ttl != null && ttl > 0) {
    await createOrUpdateTtlIndex(collection, ttl);
  }
}

async function createMainIndex(
  collection: Collection<Conversation>,
): Promise<void> {
  await collection.createIndex({ conversationId: 1, timestamp: -1 });
}

async function createOrUpdateTtlIndex(
  collection: Collection<Conversation>,
  ttl: number,
): Promise<void> {
  const existingIndexes = await collection.indexes();
  const existingTtlIndex = existingIndexes.find(isTimestampTtlIndex);

  if (
    existingTtlIndex != null &&
    existingTtlIndex.expireAfterSeconds != null &&
    existingTtlIndex.expireAfterSeconds !== ttl
  ) {
    assert(
      existingTtlIndex.name != null,
      "existing TTL index must have a name",
    );
    await collection.dropIndex(existingTtlIndex.name);
  }

  await collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: ttl });
}

function isTimestampTtlIndex(index: IndexDescriptionInfo): boolean {
  const keys = Object.keys(index.key);
  return (
    keys.length === 1 &&
    keys[0] === "timestamp" &&
    index.key.timestamp === 1 &&
    index.expireAfterSeconds != null
  );
}
