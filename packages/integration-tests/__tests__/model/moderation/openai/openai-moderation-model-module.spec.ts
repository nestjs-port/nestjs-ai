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
import { AUDIO_MODERATION_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  OPEN_AI_MODERATION_DEFAULT_MODEL,
  OPEN_AI_MODERATION_PROPERTIES_TOKEN,
  type OpenAiModerationModel,
  OpenAiModerationModelModule,
  type OpenAiModerationProperties,
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

describe("OpenAiModerationModelModule", () => {
  describe("forFeature", () => {
    it("should resolve AUDIO_MODERATION_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(AUDIO_MODERATION_MODEL_TOKEN));
    });

    it("should apply feature properties to the moderation model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeature({
            apiKey: "test-api-key",
            model: "text-moderation-stable",
            options: {
              model: "omni-moderation-latest",
            },
          }),
        ],
      }).compile();

      const moderationModel = moduleRef.get<OpenAiModerationModel>(
        AUDIO_MODERATION_MODEL_TOKEN,
      );

      expect(moderationModel.options.apiKey).toBe("test-api-key");
      expect(moderationModel.options.model).toBe("omni-moderation-latest");
    });

    it("should fall back to the default moderation model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const moderationModel = moduleRef.get<OpenAiModerationModel>(
        AUDIO_MODERATION_MODEL_TOKEN,
      );

      expect(moderationModel.options.model).toBe(
        OPEN_AI_MODERATION_DEFAULT_MODEL,
      );
    });

    it("should not export the properties token", async () => {
      const featureModule = OpenAiModerationModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      assert.exists(moduleRef.get(AUDIO_MODERATION_MODEL_TOKEN));

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(AUDIO_MODERATION_MODEL_TOKEN);
      expect(exports).not.toContain(OPEN_AI_MODERATION_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      expect(
        OpenAiModerationModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        OpenAiModerationModelModule.forFeature(
          { apiKey: "test-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve AUDIO_MODERATION_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(AUDIO_MODERATION_MODEL_TOKEN));
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): OpenAiModerationProperties => ({
              apiKey,
              model: "text-moderation-stable",
            }),
          }),
        ],
      }).compile();

      const moderationModel = moduleRef.get<OpenAiModerationModel>(
        AUDIO_MODERATION_MODEL_TOKEN,
      );

      expect(moderationModel.options.apiKey).toBe("test-api-key-from-config");
      expect(moderationModel.options.model).toBe("text-moderation-stable");
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiModerationModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
            }),
          }),
        ],
      }).compile();

      assert.exists(moduleRef.get(AUDIO_MODERATION_MODEL_TOKEN));
    });

    it("should default global to false for async", () => {
      expect(
        OpenAiModerationModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        OpenAiModerationModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
