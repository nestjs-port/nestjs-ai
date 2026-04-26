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
import { EMBEDDING_MODEL_TOKEN, VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import {
  PG_VECTOR_STORE_PROPERTIES_TOKEN,
  PgVectorStoreModule,
  type PgVectorStoreProperties,
} from "@nestjs-ai/vector-store-pgvector";
import { JSDBC_TEMPLATE } from "@nestjs-port/jsdbc";
import { assert, describe, expect, it } from "vitest";

const PGVECTOR_CONFIG_TOKEN = Symbol("PGVECTOR_CONFIG_TOKEN");

describe("PgVectorStoreModule", () => {
  describe("forFeature", () => {
    it("should resolve VECTOR_STORE_TOKEN via NestJS DI with embedding model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          PgVectorStoreModule.forFeature(
            {},
            {
              imports: [createDependencyModule()],
            },
          ),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
    });

    it("should not export properties token", async () => {
      const dependencyModule = createDependencyModule();
      const featureModule = PgVectorStoreModule.forFeature(
        {},
        {
          imports: [dependencyModule],
        },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(VECTOR_STORE_TOKEN);
      expect(exports).not.toContain(PG_VECTOR_STORE_PROPERTIES_TOKEN);
    });

    it("should default global to false", async () => {
      const dependencyModule = createDependencyModule();
      const featureModule = PgVectorStoreModule.forFeature(
        {},
        {
          imports: [dependencyModule],
        },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(featureModule.global).toBe(false);
    });

    it("should support global option", async () => {
      const dependencyModule = createDependencyModule();
      const featureModule = PgVectorStoreModule.forFeature(
        {},
        {
          imports: [dependencyModule],
          global: true,
        },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(featureModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve VECTOR_STORE_TOKEN from async factory via NestJS DI", async () => {
      const dependencyModule = createDependencyModule();
      const moduleRef = await Test.createTestingModule({
        imports: [
          PgVectorStoreModule.forFeatureAsync({
            imports: [dependencyModule],
            useFactory: () => ({}),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
    });

    it("should support imports and inject for async factory", async () => {
      const dependencyModule = createDependencyModule();

      @Module({
        providers: [
          {
            provide: PGVECTOR_CONFIG_TOKEN,
            useValue: { schemaName: "test_schema" },
          },
        ],
        exports: [PGVECTOR_CONFIG_TOKEN],
      })
      class PgVectorConfigModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          PgVectorStoreModule.forFeatureAsync({
            imports: [PgVectorConfigModule, dependencyModule],
            inject: [PGVECTOR_CONFIG_TOKEN],
            useFactory: (config: PgVectorStoreProperties) => config,
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
    });

    it("should support async factory returning a Promise", async () => {
      const dependencyModule = createDependencyModule();
      const moduleRef = await Test.createTestingModule({
        imports: [
          PgVectorStoreModule.forFeatureAsync({
            imports: [dependencyModule],
            useFactory: async () => ({}),
          }),
        ],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
    });

    it("should default global to false for async", async () => {
      const dependencyModule = createDependencyModule();
      const featureModule = PgVectorStoreModule.forFeatureAsync({
        imports: [dependencyModule],
        useFactory: () => ({}),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(featureModule.global).toBe(false);
    });

    it("should support global option for async", async () => {
      const dependencyModule = createDependencyModule();
      const featureModule = PgVectorStoreModule.forFeatureAsync({
        imports: [dependencyModule],
        useFactory: () => ({}),
        global: true,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      const vectorStore = await moduleRef.resolve(VECTOR_STORE_TOKEN);
      assert.exists(vectorStore);
      expect(featureModule.global).toBe(true);
    });
  });
});

function createDependencyModule() {
  @Module({
    providers: [
      {
        provide: EMBEDDING_MODEL_TOKEN,
        useValue: {
          dimensions: async () => 1536,
        },
      },
      {
        provide: JSDBC_TEMPLATE,
        useValue: createMockJsdbcTemplate(),
      },
    ],
    exports: [EMBEDDING_MODEL_TOKEN, JSDBC_TEMPLATE],
  })
  class DependencyModule {}

  return DependencyModule;
}

function createMockJsdbcTemplate() {
  return {
    update: async () => 1,
    query: async () => [],
    transaction: async (callback: () => Promise<void>) => callback(),
  };
}
