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
  Inject,
  Injectable,
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type OnApplicationBootstrap,
  type Provider,
} from "@nestjs/common";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import { LoggerFactory } from "@nestjs-port/core";
import type { Collection, IndexDescriptionInfo } from "mongodb";

import type { Conversation } from "../conversation.js";
import { MongoChatMemoryRepository } from "../mongo-chat-memory-repository.js";
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
      exports: [CHAT_MEMORY_TOKEN],
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [createChatMemoryProvider(), MongoChatMemoryIndexInitializer];
}

function createChatMemoryProvider(): Provider {
  return {
    provide: CHAT_MEMORY_TOKEN,
    useFactory: async (
      properties: MongoChatMemoryProperties,
    ): Promise<MongoChatMemoryRepository> => {
      const collection = await resolveCollection(properties);

      return MongoChatMemoryRepository.builder().collection(collection).build();
    },
    inject: [MONGO_CHAT_MEMORY_PROPERTIES_TOKEN],
  };
}

@Injectable()
class MongoChatMemoryIndexInitializer implements OnApplicationBootstrap {
  private readonly _logger = LoggerFactory.getLogger(
    MongoChatMemoryIndexInitializer.name,
  );

  constructor(
    @Inject(MONGO_CHAT_MEMORY_PROPERTIES_TOKEN)
    private readonly _properties: MongoChatMemoryProperties,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this._properties.createIndices) {
      return;
    }

    const collection = await resolveCollection(this._properties);

    this._logger.info("Creating MongoDB indices for ChatMemory");
    await initializeIndices(collection, this._properties.ttl, this._logger);
  }
}

async function resolveCollection(
  properties: MongoChatMemoryProperties,
): Promise<Collection<Conversation>> {
  const collectionName =
    properties.collectionName ??
    MongoChatMemoryRepository.DEFAULT_COLLECTION_NAME;

  if (properties.collection != null) {
    return properties.collection;
  }

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
  ttl: number | null | undefined,
  logger?: ReturnType<typeof LoggerFactory.getLogger>,
): Promise<void> {
  await createMainIndex(collection, logger);

  if (ttl != null && ttl > 0) {
    await createOrUpdateTtlIndex(collection, ttl, logger);
  }
}

async function createMainIndex(
  collection: Collection<Conversation>,
  logger?: ReturnType<typeof LoggerFactory.getLogger>,
): Promise<void> {
  await createIndexSafely(collection, { conversationId: 1, timestamp: -1 });
  logger?.debug("Created main MongoDB index for ChatMemory");
}

async function createOrUpdateTtlIndex(
  collection: Collection<Conversation>,
  ttl: number,
  logger?: ReturnType<typeof LoggerFactory.getLogger>,
): Promise<void> {
  const existingIndexes = await collection.indexes();
  for (const index of existingIndexes) {
    if (isTimestampTtlIndex(index) && index.expireAfterSeconds !== ttl) {
      assert(index.name != null, "existing TTL index must have a name");
      logger?.warn("Dropping existing TTL index, because TTL is different");
      await collection.dropIndex(index.name);
    }
  }

  await createIndexSafely(
    collection,
    { timestamp: 1 },
    { expireAfterSeconds: ttl },
  );
  logger?.debug("Created TTL MongoDB index for ChatMemory");
}

async function createIndexSafely(
  collection: Collection<Conversation>,
  keys: Record<string, 1 | -1>,
  options?: { expireAfterSeconds?: number },
): Promise<void> {
  if (typeof collection.createIndex === "function") {
    await collection.createIndex(keys, options);
    return;
  }

  const legacyCollection = collection as Collection<Conversation> & {
    ensureIndex?: (
      keys: Record<string, 1 | -1>,
      options?: { expireAfterSeconds?: number },
    ) => Promise<string>;
  };

  if (typeof legacyCollection.ensureIndex === "function") {
    await legacyCollection.ensureIndex(keys, options);
    return;
  }

  throw new Error(
    "Neither createIndex() nor ensureIndex() method found on Collection",
  );
}

function isTimestampTtlIndex(index: IndexDescriptionInfo): boolean {
  return (
    Object.keys(index.key).length === 1 &&
    index.key.timestamp === 1 &&
    index.expireAfterSeconds != null
  );
}
