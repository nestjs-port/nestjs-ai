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
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import {
  TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
  TransformersEmbeddingModelModule,
} from "@nestjs-ai/model-transformers";
import { NestAiModule } from "@nestjs-ai/platform";
import { describe, expect, it } from "vitest";

const MODEL_CONFIG_TOKEN = Symbol("MODEL_CONFIG_TOKEN");

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

describe("TransformersEmbeddingModelModule (forFeature / forFeatureAsync)", () => {
  describe("forFeature", () => {
    it("should resolve EMBEDDING_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature(),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<EmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );
      expect(embeddingModel).toBeDefined();
    });

    it("should resolve with custom properties", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeature({
            model: "Xenova/all-MiniLM-L6-v2",
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<EmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );
      expect(embeddingModel).toBeDefined();
    });

    it("should not export properties token", () => {
      const dynamicModule = TransformersEmbeddingModelModule.forFeature();
      const exports = dynamicModule.exports as symbol[];

      expect(exports).toContain(EMBEDDING_MODEL_TOKEN);
      expect(exports).not.toContain(TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      const dynamicModule = TransformersEmbeddingModelModule.forFeature();
      expect(dynamicModule.global).toBe(false);
    });

    it("should support global option", () => {
      const dynamicModule = TransformersEmbeddingModelModule.forFeature(
        {},
        { global: true },
      );
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve EMBEDDING_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeatureAsync({
            useFactory: () => ({
              model: "Xenova/all-MiniLM-L6-v2",
            }),
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<EmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );
      expect(embeddingModel).toBeDefined();
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeatureAsync({
            imports: [ModelConfigModule],
            inject: [MODEL_CONFIG_TOKEN],
            useFactory: (config: { model: string }) => ({
              model: config.model,
            }),
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<EmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );
      expect(embeddingModel).toBeDefined();
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          TransformersEmbeddingModelModule.forFeatureAsync({
            useFactory: async () => ({
              model: "Xenova/all-MiniLM-L6-v2",
            }),
          }),
        ],
      }).compile();

      const embeddingModel = moduleRef.get<EmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );
      expect(embeddingModel).toBeDefined();
    });

    it("should default global to false for async", () => {
      const dynamicModule = TransformersEmbeddingModelModule.forFeatureAsync({
        useFactory: () => ({}),
      });
      expect(dynamicModule.global).toBe(false);
    });

    it("should support global option for async", () => {
      const dynamicModule = TransformersEmbeddingModelModule.forFeatureAsync({
        useFactory: () => ({}),
        global: true,
      });
      expect(dynamicModule.global).toBe(true);
    });
  });
});
