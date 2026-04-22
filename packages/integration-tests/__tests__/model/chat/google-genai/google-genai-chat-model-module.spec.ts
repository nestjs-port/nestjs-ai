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
import { GoogleGenAiChatModel } from "@nestjs-ai/model-google-genai";
import {
  GoogleGenAiCachedContentService,
  GoogleGenAiChatModelModule,
  type GoogleGenAiChatOptions,
  type GoogleGenAiChatProperties,
} from "@nestjs-ai/model-google-genai";
import { ObservationFilters } from "@nestjs-port/core";
import { ObservationModule } from "@nestjs-port/observation";
import { describe, expect, it } from "vitest";

const API_KEY_TOKEN = Symbol("API_KEY_TOKEN");

@Module({
  providers: [
    {
      provide: API_KEY_TOKEN,
      useValue: "test-google-api-key",
    },
  ],
  exports: [API_KEY_TOKEN],
})
class GoogleConfigModule {}

describe("GoogleGenAiChatModelModule", () => {
  describe("forFeature", () => {
    it("resolves the chat model and client via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel).toBeDefined();
      expect(chatModel.genAiClient).toBeDefined();
    });

    it("builds a GoogleGenAI client from apiKey properties", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel.genAiClient.vertexai).toBe(false);
    });

    it("prefers Vertex AI when explicitly enabled even if apiKey is also present", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            projectId: "test-project",
            location: "us-central1",
            vertexAi: true,
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel.genAiClient.vertexai).toBe(true);
    });

    it("builds a vertex AI client when apiKey is not provided", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            projectId: "test-project",
            location: "us-central1",
            options: { model: "gemini-2.0-flash" },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel.genAiClient.vertexai).toBe(true);
    });

    it("fails fast when vertex AI is explicitly enabled without project or location", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            GoogleGenAiChatModelModule.forFeature({
              vertexAi: true,
              apiKey: "test-google-api-key",
              options: { model: "gemini-2.0-flash" },
            }),
          ],
        }).compile(),
      ).rejects.toThrow(
        "Google GenAI projectId and location must be set when vertexAi is enabled",
      );
    });

    it("fails when neither apiKey nor vertex AI configuration is provided", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            GoogleGenAiChatModelModule.forFeature({
              options: { model: "gemini-2.0-flash" },
            }),
          ],
        }).compile(),
      ).rejects.toThrow(
        "Incomplete Google GenAI configuration: provide apiKey for Gemini API or projectId and location for Vertex AI",
      );
    });

    it("applies custom options to the chat model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            options: {
              model: "gemini-2.0-flash",
              temperature: 0.2,
              topP: 0.7,
              maxOutputTokens: 128,
            },
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);
      const defaultOptions = chatModel.defaultOptions as GoogleGenAiChatOptions;

      expect(defaultOptions.model).toBe("gemini-2.0-flash");
      expect(defaultOptions.temperature).toBe(0.2);
      expect(defaultOptions.topP).toBe(0.7);
      expect(defaultOptions.maxOutputTokens).toBe(128);
    });

    it("adds the tool call content filter when enabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot(),
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            toolCalling: { includeContent: true },
          }),
        ],
      }).compile();

      moduleRef.get(CHAT_MODEL_TOKEN);

      expect(moduleRef.get(ObservationFilters).filters).toHaveLength(1);
    });

    it("resolves cached content service by default", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
          }),
        ],
      }).compile();

      expect(moduleRef.get(GoogleGenAiCachedContentService)).toBeDefined();
    });

    it("omits cached content service when disabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeature({
            apiKey: "test-google-api-key",
            enableCachedContent: false,
          }),
        ],
      }).compile();

      expect(() => moduleRef.get(GoogleGenAiCachedContentService)).toThrow(
        "Nest could not find GoogleGenAiCachedContentService element (this provider does not exist in the current context)",
      );
    });

    it("uses global false by default", () => {
      expect(
        GoogleGenAiChatModelModule.forFeature({
          apiKey: "test-google-api-key",
        }).global,
      ).toBe(false);
    });

    it("supports global true", () => {
      expect(
        GoogleGenAiChatModelModule.forFeature(
          { apiKey: "test-google-api-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("resolves the chat model from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-google-api-key",
              options: { model: "gemini-2.0-flash" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel).toBeDefined();
      expect(chatModel.genAiClient).toBeDefined();
    });

    it("supports imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeatureAsync({
            imports: [GoogleConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string): GoogleGenAiChatProperties => ({
              apiKey,
              options: { model: "gemini-2.0-flash" },
            }),
          }),
        ],
      }).compile();

      const chatModel = moduleRef.get<GoogleGenAiChatModel>(CHAT_MODEL_TOKEN);

      expect(chatModel.genAiClient.vertexai).toBe(false);
      expect(chatModel).toBeDefined();
    });

    it("supports async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          GoogleGenAiChatModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-google-api-key",
              options: { model: "gemini-2.0-flash" },
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(CHAT_MODEL_TOKEN)).toBeDefined();
    });

    it("uses global false by default for async", () => {
      expect(
        GoogleGenAiChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("supports global true for async", () => {
      expect(
        GoogleGenAiChatModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
