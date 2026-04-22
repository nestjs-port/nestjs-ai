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
import { TransformersEmbeddingModel } from "@nestjs-ai/model-transformers";
import { TransformersEmbeddingModelModule } from "@nestjs-ai/model-transformers";
import {
  KeyValues,
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
} from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

const MODEL_CONFIG_TOKEN = Symbol("MODEL_CONFIG_TOKEN");
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
      provide: MODEL_CONFIG_TOKEN,
      useValue: { model: "Xenova/all-MiniLM-L6-v2" },
    },
  ],
  exports: [MODEL_CONFIG_TOKEN],
})
class ModelConfigModule {}

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

describe("TransformersEmbeddingModelModule", () => {
  describe("forFeature", () => {
    it("resolves the embedding model via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeature({
            model: "Xenova/all-MiniLM-L6-v2",
          }),
        ],
      }).compile();

      expect(moduleRef.get(EMBEDDING_MODEL_TOKEN)).toBeDefined();
    });

    it("maps properties into the embedding model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeature({
            model: "Xenova/custom-model",
            cache: { directory: "/tmp/transformers-cache" },
            quantized: true,
            config: { pad_token_id: 0 },
            localFilesOnly: true,
            revision: "main",
            metadataMode: MetadataMode.ALL,
          }),
        ],
      }).compile();

      const model = moduleRef.get<TransformersEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(model.model).toBe("Xenova/custom-model");
      expect(model.cacheDir).toBe("/tmp/transformers-cache");
      expect(model.quantized).toBe(true);
      expect(model.config).toEqual({ pad_token_id: 0 });
      expect(model.localFilesOnly).toBe(true);
      expect(model.revision).toBe("main");
      expect(model.metadataMode).toBe(MetadataMode.ALL);
    });

    it("injects observation registry and convention when provided", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeature(
            {
              model: "Xenova/all-MiniLM-L6-v2",
            },
            {
              imports: [ObservationConfigModule],
            },
          ),
        ],
      }).compile();

      const model = moduleRef.get<TransformersEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(model.observationRegistry).toBe(NoopObservationRegistry.INSTANCE);
      expect(model.observationConvention).toBe(OBSERVATION_CONVENTION);
    });

    it("uses global false by default", () => {
      expect(
        TransformersEmbeddingModelModule.forFeature({
          model: "Xenova/all-MiniLM-L6-v2",
        }).global,
      ).toBe(false);
    });

    it("supports global true", () => {
      expect(
        TransformersEmbeddingModelModule.forFeature(
          { model: "Xenova/all-MiniLM-L6-v2" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("resolves the embedding model from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeatureAsync({
            useFactory: () => ({
              model: "Xenova/all-MiniLM-L6-v2",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(EMBEDDING_MODEL_TOKEN)).toBeDefined();
    });

    it("supports imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeatureAsync({
            imports: [ModelConfigModule],
            inject: [MODEL_CONFIG_TOKEN],
            useFactory: (config: { model: string }) => ({
              model: config.model,
            }),
          }),
        ],
      }).compile();

      const model = moduleRef.get<TransformersEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      expect(model.model).toBe("Xenova/all-MiniLM-L6-v2");
    });

    it("supports async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransformersEmbeddingModelModule.forFeatureAsync({
            useFactory: async () => ({
              model: "Xenova/all-MiniLM-L6-v2",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(EMBEDDING_MODEL_TOKEN)).toBeDefined();
    });

    it("uses global false by default for async", () => {
      expect(
        TransformersEmbeddingModelModule.forFeatureAsync({
          useFactory: () => ({}),
        }).global,
      ).toBe(false);
    });

    it("supports global true for async", () => {
      expect(
        TransformersEmbeddingModelModule.forFeatureAsync({
          useFactory: () => ({}),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
