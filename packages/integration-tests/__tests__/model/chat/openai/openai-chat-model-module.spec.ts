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
import { CHAT_MODEL_TOKEN, ObservationFilters } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import {
  OPEN_AI_CHAT_DEFAULT_MODEL,
  OPEN_AI_CHAT_PROPERTIES_TOKEN,
  OpenAiChatModelModule,
  type OpenAiChatProperties,
} from "@nestjs-ai/model-openai";
import { ObservationModule } from "@nestjs-ai/observation";
import { describe, expect, it } from "vitest";

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

describe("OpenAiChatModelModule", () => {
  describe("forFeature", () => {
    it("should resolve CHAT_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      expect(moduleRef.get(CHAT_MODEL_TOKEN)).toBeDefined();
    });

    it("should apply feature properties to the chat model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeature({
            apiKey: "test-api-key",
            model: "gpt-5-pro",
            options: {
              model: "gpt-5-mini",
              temperature: 0.2,
              topP: 0.7,
              maxTokens: 128,
              user: "test-user",
            },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          apiKey: string | null;
          model: string | null;
          temperature: number | null;
          topP: number | null;
          maxTokens: number | null;
          user: string | null;
        };
      };

      expect(chatModel.options.apiKey).toBe("test-api-key");
      expect(chatModel.options.model).toBe("gpt-5-mini");
      expect(chatModel.options.temperature).toBe(0.2);
      expect(chatModel.options.topP).toBe(0.7);
      expect(chatModel.options.maxTokens).toBe(128);
      expect(chatModel.options.user).toBe("test-user");
    });

    it("should fall back to the default chat model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          model: string | null;
        };
      };

      expect(chatModel.options.model).toBe(OPEN_AI_CHAT_DEFAULT_MODEL);
    });

    it("adds the tool call content filter when enabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot(),
          OpenAiChatModelModule.forFeature({
            apiKey: "test-key",
            toolCalling: { includeContent: true },
          }),
        ],
      }).compile();

      moduleRef.get(CHAT_MODEL_TOKEN);

      expect(moduleRef.get(ObservationFilters).filters).toHaveLength(1);
    });

    it("should not export the properties token", async () => {
      const featureModule = OpenAiChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      expect(moduleRef.get(CHAT_MODEL_TOKEN)).toBeDefined();

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(CHAT_MODEL_TOKEN);
      expect(exports).not.toContain(OPEN_AI_CHAT_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      expect(
        OpenAiChatModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        OpenAiChatModelModule.forFeature(
          { apiKey: "test-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve CHAT_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): OpenAiChatProperties => ({
              apiKey,
              model: "gpt-5-pro",
              options: {
                user: "async-user",
              },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          apiKey: string | null;
          model: string | null;
          user: string | null;
        };
      };

      expect(chatModel.options.apiKey).toBe("test-api-key-from-config");
      expect(chatModel.options.model).toBe("gpt-5-pro");
      expect(chatModel.options.user).toBe("async-user");
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiChatModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
    });

    it("should default global to false for async", () => {
      expect(
        OpenAiChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        OpenAiChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
