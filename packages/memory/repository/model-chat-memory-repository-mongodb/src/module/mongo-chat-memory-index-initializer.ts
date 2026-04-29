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
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { LoggerFactory, type Logger } from "@nestjs-port/core";
import type { Collection, IndexDescriptionInfo } from "mongodb";

import type { Conversation } from "../conversation.js";
import { MongoChatMemoryRepository } from "../mongo-chat-memory-repository.js";
import {
  MONGO_CHAT_MEMORY_PROPERTIES_TOKEN,
  type MongoChatMemoryProperties,
} from "./mongo-chat-memory-properties.js";

@Injectable()
export class MongoChatMemoryIndexInitializer implements OnApplicationBootstrap {
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

    const collection = await resolveMongoChatMemoryCollection(this._properties);

    this._logger.info("Creating MongoDB indices for ChatMemory");
    await initializeIndices(collection, this._properties.ttl, this._logger);
  }
}

export async function resolveMongoChatMemoryCollection(
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
  logger?: Logger,
): Promise<void> {
  await createMainIndex(collection, logger);

  if (ttl != null && ttl > 0) {
    await createOrUpdateTtlIndex(collection, ttl, logger);
  }
}

async function createMainIndex(
  collection: Collection<Conversation>,
  logger?: Logger,
): Promise<void> {
  await createIndexSafely(collection, { conversationId: 1, timestamp: -1 });
  logger?.debug("Created main MongoDB index for ChatMemory");
}

async function createOrUpdateTtlIndex(
  collection: Collection<Conversation>,
  ttl: number,
  logger?: Logger,
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
