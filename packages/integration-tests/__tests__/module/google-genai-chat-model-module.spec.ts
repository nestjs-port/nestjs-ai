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
import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import {
  TOOL_CALLING_MANAGER_OVERRIDE_TOKEN,
  TOOL_CALLING_MANAGER_TOKEN,
} from "@nestjs-ai/model";
import {
  GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
  GoogleGenAiChatModelModule,
  type GoogleGenAiChatProperties,
} from "@nestjs-ai/model-google-genai";
import { NestAiModule } from "@nestjs-ai/platform";
import { describe, expect, it } from "vitest";

const CONFIG_TOKEN = Symbol("CONFIG_TOKEN");
const TOOL_CALLING_MANAGER_OVERRIDE = {
  resolvedBy: "override",
};

@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useValue: { apiKey: "test-google-api-key" },
    },
  ],
  exports: [CONFIG_TOKEN],
})
class GoogleConfigModule {}

@Global()
@Module({
  providers: [
    {
      provide: TOOL_CALLING_MANAGER_OVERRIDE_TOKEN,
      useValue: TOOL_CALLING_MANAGER_OVERRIDE,
    },
  ],
  exports: [TOOL_CALLING_MANAGER_OVERRIDE_TOKEN],
})
class ToolCallingManagerOverrideModule {}

describe("GoogleGenAiChatModelModule", () => {
  describe("forFeature", () => {
    it("should resolve CHAT_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-key",
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should not export properties token", async () => {
      const featureModule = GoogleGenAiChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(CHAT_MODEL_TOKEN);
      expect(exports).not.toContain(GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN);
    });

    it("should default global to false", async () => {
      const featureModule = GoogleGenAiChatModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(false);
    });

    it("should support global option", async () => {
      const featureModule = GoogleGenAiChatModelModule.forFeature(
        { apiKey: "test-key" },
        { global: true },
      );

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(true);
    });

    it("should prefer a provided tool calling manager override", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          ToolCallingManagerOverrideModule,
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-key",
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      expect(moduleRef.get(TOOL_CALLING_MANAGER_TOKEN)).toBe(
        TOOL_CALLING_MANAGER_OVERRIDE,
      );

      expect(
        (
          moduleRef.get(CHAT_MODEL_TOKEN) as unknown as {
            _toolCallingManager: { _delegateToolCallingManager: unknown };
          }
        )._toolCallingManager._delegateToolCallingManager,
      ).toBe(TOOL_CALLING_MANAGER_OVERRIDE);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve CHAT_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRoot(),
          GoogleGenAiChatModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-google-key",
              options: { model: "gemini-2.0-flash" },
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
          GoogleGenAiChatModelModule.forFeatureAsync({
            imports: [GoogleConfigModule],
            inject: [CONFIG_TOKEN],
            useFactory: (
              config: Pick<GoogleGenAiChatProperties, "apiKey">,
            ): GoogleGenAiChatProperties => ({
              apiKey: config.apiKey,
              options: { model: "gemini-2.0-flash" },
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
          GoogleGenAiChatModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-google-key",
              options: { model: "gemini-2.0-flash" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN);
      expect(chatModel).toBeDefined();
    });

    it("should default global to false for async", async () => {
      const featureModule = GoogleGenAiChatModelModule.forFeatureAsync({
        useFactory: () => ({ apiKey: "key" }),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot(), featureModule],
      }).compile();

      expect(moduleRef.get<ChatModel>(CHAT_MODEL_TOKEN)).toBeDefined();
      expect(featureModule.global).toBe(false);
    });

    it("should support global option for async", async () => {
      const featureModule = GoogleGenAiChatModelModule.forFeatureAsync({
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
