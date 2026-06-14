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
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import { TransformersEmbeddingModelModule } from "@nestjs-ai/model-transformers";
import { NestAiModule } from "@nestjs-ai/platform";
import {
  ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN,
  ElasticsearchVectorStoreModule,
  type ElasticsearchVectorStoreProperties,
} from "@nestjs-ai/vector-store-elasticsearch";
import { assert, describe, expect, it, vi } from "vitest";

const ELASTICSEARCH_CONFIG_TOKEN = Symbol("ELASTICSEARCH_CONFIG_TOKEN");

describe("ElasticsearchVectorStoreModule", () => {
  describe("forFeature", () => {
    it("should resolve VECTOR_STORE_TOKEN via NestJS DI with embedding model", async () => {
      const client = createMockElasticsearchClient();

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          ElasticsearchVectorStoreModule.forFeature({
            client: client as never,
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
    });

    it("should not export properties token", async () => {
      const client = createMockElasticsearchClient();
      const featureModule = ElasticsearchVectorStoreModule.forFeature({
        client: client as never,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          featureModule,
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(VECTOR_STORE_TOKEN);
      expect(exports).not.toContain(
        ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN,
      );
    });

    it("should default global to false", async () => {
      const client = createMockElasticsearchClient();
      const featureModule = ElasticsearchVectorStoreModule.forFeature({
        client: client as never,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          featureModule,
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
      expect(featureModule.global).toBe(false);
    });

    it("should support global option", async () => {
      const client = createMockElasticsearchClient();
      const featureModule = ElasticsearchVectorStoreModule.forFeature(
        { client: client as never },
        { global: true },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          featureModule,
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
      expect(featureModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve VECTOR_STORE_TOKEN from async factory via NestJS DI", async () => {
      const client = createMockElasticsearchClient();

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          ElasticsearchVectorStoreModule.forFeatureAsync({
            useFactory: () => ({
              client: client as never,
            }),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
    });

    it("should support imports and inject for async factory", async () => {
      const client = createMockElasticsearchClient();

      @Module({
        providers: [
          {
            provide: ELASTICSEARCH_CONFIG_TOKEN,
            useValue: {
              client: client as never,
              indexName: "test-index",
            },
          },
        ],
        exports: [ELASTICSEARCH_CONFIG_TOKEN],
      })
      class ElasticsearchConfigModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          ElasticsearchVectorStoreModule.forFeatureAsync({
            imports: [ElasticsearchConfigModule],
            inject: [ELASTICSEARCH_CONFIG_TOKEN],
            useFactory: (config: ElasticsearchVectorStoreProperties) => config,
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
    });

    it("should support async factory returning a Promise", async () => {
      const client = createMockElasticsearchClient();

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          ElasticsearchVectorStoreModule.forFeatureAsync({
            useFactory: async () => ({
              client: client as never,
            }),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
    });

    it("should default global to false for async", async () => {
      const client = createMockElasticsearchClient();
      const featureModule = ElasticsearchVectorStoreModule.forFeatureAsync({
        useFactory: () => ({
          client: client as never,
        }),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          featureModule,
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
      expect(featureModule.global).toBe(false);
    });

    it("should support global option for async", async () => {
      const client = createMockElasticsearchClient();
      const featureModule = ElasticsearchVectorStoreModule.forFeatureAsync({
        useFactory: () => ({
          client: client as never,
        }),
        global: true,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({}, { global: true }),
          featureModule,
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(client.child).toHaveBeenCalledTimes(1);
      expect(featureModule.global).toBe(true);
    });
  });
});

function createMockElasticsearchClient() {
  const client = {
    child: vi.fn(),
  };
  client.child.mockReturnValue(client);
  return client;
}
