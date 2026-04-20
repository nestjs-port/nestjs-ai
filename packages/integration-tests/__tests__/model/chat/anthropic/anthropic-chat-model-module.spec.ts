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
import { CHAT_MODEL_TOKEN, ms, ObservationFilters } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import {
  ANTHROPIC_CHAT_DEFAULT_MODEL,
  ANTHROPIC_CHAT_PROPERTIES_TOKEN,
  AnthropicChatModelModule,
  type AnthropicChatProperties,
} from "@nestjs-ai/model-anthropic";
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

describe("AnthropicChatModelModule", () => {
  describe("forFeature", () => {
    it("should resolve CHAT_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AnthropicChatModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      expect(moduleRef.get(CHAT_MODEL_TOKEN)).toBeDefined();
    });

    it("should apply feature properties to the chat model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AnthropicChatModelModule.forFeature({
            apiKey: "test-api-key",
            baseUrl: "http://test-base-url",
            timeout: ms(12_345),
            maxRetries: 7,
            customHeaders: {
              "x-test-header": "header-value",
            },
            options: {
              model: "claude-sonnet-4-20250514",
              temperature: 0.2,
              topP: 0.7,
              maxTokens: 128,
              httpHeaders: {
                "x-chat-header": "chat-value",
              },
            },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          apiKey: string | null;
          baseUrl: string | null;
          timeout: number | null;
          maxRetries: number | null;
          customHeaders: Record<string, string>;
          model: string | null;
          temperature: number | null;
          topP: number | null;
          maxTokens: number | null;
          httpHeaders: Record<string, string>;
        };
      };

      expect(chatModel.options.apiKey).toBe("test-api-key");
      expect(chatModel.options.baseUrl).toBe("http://test-base-url");
      expect(chatModel.options.timeout).toBe(12_345);
      expect(chatModel.options.maxRetries).toBe(7);
      expect(chatModel.options.customHeaders).toEqual({
        "x-test-header": "header-value",
      });
      expect(chatModel.options.model).toBe("claude-sonnet-4-20250514");
      expect(chatModel.options.temperature).toBe(0.2);
      expect(chatModel.options.topP).toBe(0.7);
      expect(chatModel.options.maxTokens).toBe(128);
      expect(chatModel.options.httpHeaders).toEqual({
        "x-chat-header": "chat-value",
      });
    });

    it("should fall back to the default chat model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AnthropicChatModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          model: string | null;
        };
      };

      expect(chatModel.options.model).toBe(ANTHROPIC_CHAT_DEFAULT_MODEL);
    });

    it("adds the tool call content filter when enabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot(),
          AnthropicChatModelModule.forFeature({
            apiKey: "test-key",
            toolCalling: { includeContent: true },
          }),
        ],
      }).compile();

      moduleRef.get(CHAT_MODEL_TOKEN);

      expect(moduleRef.get(ObservationFilters).filters).toHaveLength(1);
    });

    it("should not export the properties token", async () => {
      const featureModule = AnthropicChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      expect(moduleRef.get(CHAT_MODEL_TOKEN)).toBeDefined();

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(CHAT_MODEL_TOKEN);
      expect(exports).not.toContain(ANTHROPIC_CHAT_PROPERTIES_TOKEN);
    });

    it("should default global to false", () => {
      expect(
        AnthropicChatModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        AnthropicChatModelModule.forFeature(
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
          AnthropicChatModelModule.forFeatureAsync({
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
          AnthropicChatModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): AnthropicChatProperties => ({
              apiKey,
              baseUrl: "http://async-base-url",
              options: {
                model: "claude-sonnet-4-20250514",
                maxTokens: 256,
              },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
        options: {
          apiKey: string | null;
          baseUrl: string | null;
          model: string | null;
          maxTokens: number | null;
        };
      };

      expect(chatModel.options.apiKey).toBe("test-api-key-from-config");
      expect(chatModel.options.baseUrl).toBe("http://async-base-url");
      expect(chatModel.options.model).toBe("claude-sonnet-4-20250514");
      expect(chatModel.options.maxTokens).toBe(256);
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AnthropicChatModelModule.forFeatureAsync({
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
        AnthropicChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        AnthropicChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
