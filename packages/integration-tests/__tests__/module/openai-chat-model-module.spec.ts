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
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import {
  OPEN_AI_CHAT_PROPERTIES_TOKEN,
  OpenAiChatModelModule,
  type OpenAiChatProperties,
} from "@nestjs-ai/model-openai";
import { NestAiModule } from "@nestjs-ai/platform";
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
          NestAiModule.forRoot(),
          OpenAiChatModelModule.forFeature({
            apiKey: "test-key",
            options: { model: "gpt-4o-mini" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should not export properties token", async () => {
      const featureModule = OpenAiChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(CHAT_MODEL_TOKEN);
      expect(exports).not.toContain(OPEN_AI_CHAT_PROPERTIES_TOKEN);
    });

    it("should default global to false", async () => {
      const featureModule = OpenAiChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(false);
    });

    it("should support global option", async () => {
      const featureModule = OpenAiChatModelModule.forFeature(
        { apiKey: "test-key" },
        { global: true },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve CHAT_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          OpenAiChatModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
              options: { model: "gpt-4o-mini" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          OpenAiChatModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): OpenAiChatProperties => ({
              apiKey,
              options: { model: "gpt-4o-mini" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          OpenAiChatModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
              options: { model: "gpt-4o-mini" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should default global to false for async", async () => {
      const featureModule = OpenAiChatModelModule.forFeatureAsync({
        useFactory: () => ({ apiKey: "key" }),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(false);
    });

    it("should support global option for async", async () => {
      const featureModule = OpenAiChatModelModule.forFeatureAsync({
        useFactory: () => ({ apiKey: "key" }),
        global: true,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(true);
    });
  });
});
