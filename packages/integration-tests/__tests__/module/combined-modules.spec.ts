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
import { Test } from "@nestjs/testing";
import {
  CHAT_MODEL_TOKEN,
  EMBEDDING_MODEL_TOKEN,
  HTTP_CLIENT_TOKEN,
  VECTOR_STORE_TOKEN,
} from "@nestjs-ai/commons";
import type { ChatModel, EmbeddingModel } from "@nestjs-ai/model";
import { OpenAiChatModelModule } from "@nestjs-ai/model-openai";
import { TransformersEmbeddingModelModule } from "@nestjs-ai/model-transformers";
import { NestAiModule } from "@nestjs-ai/platform";
import { RedisVectorStoreModule } from "@nestjs-ai/vector-store-redis";
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

describe("Combined module registration", () => {
  it("should resolve all tokens when platform + chat model + embedding + vector store are registered together", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestAiModule.forRoot(),
        OpenAiChatModelModule.forFeature({
          apiKey: "test-key",
          options: { model: "gpt-4o-mini" },
        }),
        TransformersEmbeddingModelModule.forFeature({}, { global: true }),
        RedisVectorStoreModule.forFeature({
          clientOptions: { url: "redis://localhost:6379" },
        }),
      ],
    }).compile();

    expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBeDefined();
    expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
    expect(moduleRef.get<EmbeddingModel>(EMBEDDING_MODEL_TOKEN)).toBeDefined();

    const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
    expect(vectorStore).toBeDefined();
  });

  it("should resolve all tokens when using forRootAsync + forFeatureAsync pattern", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestAiModule.forRootAsync({
          useFactory: async () => ({}),
        }),
        OpenAiChatModelModule.forFeatureAsync({
          useFactory: async () => ({
            apiKey: "async-key",
            options: { model: "gpt-4o-mini" },
          }),
        }),
        TransformersEmbeddingModelModule.forFeatureAsync({
          useFactory: async () => ({}),
          global: true,
        }),
        RedisVectorStoreModule.forFeatureAsync({
          useFactory: async () => ({
            clientOptions: { url: "redis://localhost:6379" },
          }),
        }),
      ],
    }).compile();

    expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBeDefined();
    expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
    expect(moduleRef.get<EmbeddingModel>(EMBEDDING_MODEL_TOKEN)).toBeDefined();

    const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
    expect(vectorStore).toBeDefined();
  });

  it("should resolve tokens when mixing sync forRoot with async forFeature", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestAiModule.forRoot(),
        OpenAiChatModelModule.forFeatureAsync({
          useFactory: () => ({
            apiKey: "mixed-key",
            options: { model: "gpt-4o-mini" },
          }),
        }),
        TransformersEmbeddingModelModule.forFeature({}, { global: true }),
        RedisVectorStoreModule.forFeatureAsync({
          useFactory: () => ({
            clientOptions: { url: "redis://localhost:6379" },
          }),
        }),
      ],
    }).compile();

    expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBeDefined();
    expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
    expect(moduleRef.get<EmbeddingModel>(EMBEDDING_MODEL_TOKEN)).toBeDefined();

    const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
    expect(vectorStore).toBeDefined();
  });
});
