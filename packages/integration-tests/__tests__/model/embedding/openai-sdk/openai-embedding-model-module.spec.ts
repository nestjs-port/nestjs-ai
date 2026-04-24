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
import { EMBEDDING_MODEL_TOKEN, MetadataMode } from "@nestjs-ai/commons";
import { EmbeddingModelObservationConvention } from "@nestjs-ai/model";
import {
  OPEN_AI_EMBEDDING_DEFAULT_MODEL,
  OPEN_AI_EMBEDDING_PROPERTIES_TOKEN,
  type OpenAiEmbeddingModel,
  OpenAiEmbeddingModelModule,
  type OpenAiEmbeddingProperties,
} from "@nestjs-ai/model-openai";
import {
  KeyValues,
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
} from "@nestjs-port/core";
import { assert, describe, expect, it } from "vitest";

const API_KEY_TOKEN = Symbol("API_KEY_TOKEN");
const OBSERVATION_CONVENTION =
  new (class extends EmbeddingModelObservationConvention {
    override getName(): string {
      return "custom.embedding";
    }

    override getContextualName(): string {
      return "custom";
    }

    override getLowCardinalityKeyValues(): KeyValues {
      return KeyValues.empty();
    }

    override getHighCardinalityKeyValues(): KeyValues {
      return KeyValues.empty();
    }
  })();

@Module({
  providers: [
    {
      provide: API_KEY_TOKEN,
      useValue: "test-api-key-from-config",
    },
  ],
  exports: [API_KEY_TOKEN],
})
class ApiKeyConfigModule {}

@Module({
  providers: [
    {
      provide: OBSERVATION_REGISTRY_TOKEN,
      useValue: NoopObservationRegistry.INSTANCE,
    },
    {
      provide: EmbeddingModelObservationConvention,
      useValue: OBSERVATION_CONVENTION,
    },
  ],
  exports: [OBSERVATION_REGISTRY_TOKEN, EmbeddingModelObservationConvention],
})
class ObservationConfigModule {}

describe("OpenAiEmbeddingModelModule", () => {
  describe("forFeature", () => {
    it("should resolve EMBEDDING_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(EMBEDDING_MODEL_TOKEN));
    });

    it("should apply feature properties to the embedding model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeature({
            apiKey: "test-api-key",
            model: "text-embedding-3-large",
            metadataMode: MetadataMode.ALL,
            options: {
              model: "text-embedding-3-small",
              user: "test-user",
              dimensions: 1024,
            },
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<OpenAiEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(embeddingModel.options.apiKey).toBe("test-api-key");
      expect(embeddingModel.options.model).toBe("text-embedding-3-small");
      expect(embeddingModel.options.user).toBe("test-user");
      expect(embeddingModel.options.dimensions).toBe(1024);
      expect(embeddingModel.metadataMode).toBe(MetadataMode.ALL);
    });

    it("should fall back to the default embedding model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<OpenAiEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(embeddingModel.options.model).toBe(
        OPEN_AI_EMBEDDING_DEFAULT_MODEL,
      );
    });

    it("should inject observation registry and convention when provided", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeature(
            {
              apiKey: "test-key",
            },
            {
              imports: [ObservationConfigModule],
            },
          ),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<OpenAiEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(embeddingModel.observationRegistry).toBe(
        NoopObservationRegistry.INSTANCE,
      );
      expect(embeddingModel.observationConvention).toBe(OBSERVATION_CONVENTION);
    });

    it("should not export the properties token", async () => {
      const featureModule = OpenAiEmbeddingModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      assert.exists(moduleRef.get(EMBEDDING_MODEL_TOKEN));

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(EMBEDDING_MODEL_TOKEN);
      expect(exports).not.toContain(OPEN_AI_EMBEDDING_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      expect(
        OpenAiEmbeddingModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        OpenAiEmbeddingModelModule.forFeature(
          { apiKey: "test-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve EMBEDDING_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(EMBEDDING_MODEL_TOKEN));
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): OpenAiEmbeddingProperties => ({
              apiKey,
              model: "text-embedding-3-large",
              options: {
                user: "async-user",
              },
            }),
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<OpenAiEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(embeddingModel.options.apiKey).toBe("test-api-key-from-config");
      expect(embeddingModel.options.model).toBe("text-embedding-3-large");
      expect(embeddingModel.options.user).toBe("async-user");
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiEmbeddingModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(EMBEDDING_MODEL_TOKEN));
    });

    it("should default global to false for async", () => {
      expect(
        OpenAiEmbeddingModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        OpenAiEmbeddingModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
