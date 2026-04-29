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
import { Test } from "@nestjs/testing";
import type { IndexDescriptionInfo } from "mongodb";
import { assert, describe, expect, it, vi } from "vitest";

import { MongoChatMemoryModule } from "../module/mongo-chat-memory.module.js";

describe("MongoChatMemoryModule", () => {
  it("should resolve CHAT_MEMORY_TOKEN via NestJS DI", async () => {
    const collection = createMockCollection();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongoChatMemoryModule.forFeature({
          collection: collection as never,
          createIndices: false,
        }),
      ],
    }).compile();

    await moduleRef.init();

    assert.exists(moduleRef.get(CHAT_MEMORY_TOKEN));
  });

  it("should create MongoDB indices on application bootstrap", async () => {
    const collection = createMockCollection();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongoChatMemoryModule.forFeature({
          collection: collection as never,
          createIndices: true,
          ttl: 3600,
        }),
      ],
    }).compile();

    await moduleRef.init();

    expect(collection.createIndex).toHaveBeenCalledWith(
      { conversationId: 1, timestamp: -1 },
      undefined,
    );
    expect(collection.createIndex).toHaveBeenCalledWith(
      { timestamp: 1 },
      { expireAfterSeconds: 3600 },
    );
    expect(collection.dropIndex).not.toHaveBeenCalled();
  });

  it("should recreate the TTL index when the configured TTL changes", async () => {
    const collection = createMockCollection({
      indexes: [
        {
          name: "timestamp_1",
          key: { timestamp: 1 },
          expireAfterSeconds: 1800,
        } as IndexDescriptionInfo,
      ],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongoChatMemoryModule.forFeature({
          collection: collection as never,
          createIndices: true,
          ttl: 3600,
        }),
      ],
    }).compile();

    await moduleRef.init();

    expect(collection.dropIndex).toHaveBeenCalledWith("timestamp_1");
    expect(collection.createIndex).toHaveBeenCalledWith(
      { timestamp: 1 },
      { expireAfterSeconds: 3600 },
    );
  });
});

function createMockCollection(options?: { indexes?: IndexDescriptionInfo[] }) {
  return {
    createIndex: vi.fn(async () => "OK"),
    indexes: vi.fn(async () => options?.indexes ?? []),
    dropIndex: vi.fn(async () => undefined),
  } as any;
}
