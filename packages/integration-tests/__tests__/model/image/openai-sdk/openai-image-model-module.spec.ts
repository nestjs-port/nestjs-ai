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
import { IMAGE_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  OPEN_AI_IMAGE_DEFAULT_MODEL,
  OPEN_AI_IMAGE_PROPERTIES_TOKEN,
  type OpenAiImageModel,
  OpenAiImageModelModule,
  type OpenAiImageProperties,
} from "@nestjs-ai/model-openai";
import { assert, describe, expect, it } from "vitest";

const API_KEY_TOKEN = Symbol("API_KEY_TOKEN");

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

describe("OpenAiImageModelModule", () => {
  describe("forFeature", () => {
    it("should resolve IMAGE_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(IMAGE_MODEL_TOKEN));
    });

    it("should apply feature properties to the image model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeature({
            apiKey: "test-api-key",
            model: "gpt-image-1",
            options: {
              model: "gpt-image-2",
              n: 2,
              width: 1024,
              height: 1536,
              user: "test-user",
            },
          }),
        ],
      }).compile();

      const imageModel = moduleRef.get<OpenAiImageModel>(IMAGE_MODEL_TOKEN);

      expect(imageModel.options.apiKey).toBe("test-api-key");
      expect(imageModel.options.model).toBe("gpt-image-2");
      expect(imageModel.options.n).toBe(2);
      expect(imageModel.options.size).toBe("1024x1536");
      expect(imageModel.options.user).toBe("test-user");
    });

    it("should fall back to the default image model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const imageModel = moduleRef.get<OpenAiImageModel>(IMAGE_MODEL_TOKEN);

      expect(imageModel.options.model).toBe(OPEN_AI_IMAGE_DEFAULT_MODEL);
    });

    it("should not export the properties token", async () => {
      const featureModule = OpenAiImageModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      assert.exists(moduleRef.get(IMAGE_MODEL_TOKEN));

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(IMAGE_MODEL_TOKEN);
      expect(exports).not.toContain(OPEN_AI_IMAGE_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      expect(
        OpenAiImageModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        OpenAiImageModelModule.forFeature(
          { apiKey: "test-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve IMAGE_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(IMAGE_MODEL_TOKEN));
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): OpenAiImageProperties => ({
              apiKey,
              model: "gpt-image-1",
              options: {
                user: "async-user",
              },
            }),
          }),
        ],
      }).compile();

      const imageModel = moduleRef.get<OpenAiImageModel>(IMAGE_MODEL_TOKEN);

      expect(imageModel.options.apiKey).toBe("test-api-key-from-config");
      expect(imageModel.options.model).toBe("gpt-image-1");
      expect(imageModel.options.user).toBe("async-user");
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiImageModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(IMAGE_MODEL_TOKEN));
    });

    it("should default global to false for async", () => {
      expect(
        OpenAiImageModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        OpenAiImageModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
