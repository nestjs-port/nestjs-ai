/*
 * Copyright 2023-present the original author or authors.
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

import { GoogleGenAI } from "@google/genai";
import type { FactoryProvider } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { GoogleGenAiCachedContentService } from "../../cache";
import { GoogleGenAiChatModel } from "../../google-gen-ai-chat-model";
import type { GoogleGenAiChatOptions } from "../../google-gen-ai-chat-options";
import {
  GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
  GoogleGenAiChatModelModule,
} from "../google-gen-ai-chat-model.module";
import type { GoogleGenAiChatProperties } from "../google-gen-ai-properties";

describe("GoogleGenAiChatModelModule", () => {
  it("registers observation, client, chat model, and cached content providers via forFeature", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === GoogleGenAI)).toBe(true);
    expect(providers.some((p) => p.provide === CHAT_MODEL_TOKEN)).toBe(true);
    expect(
      providers.some((p) => p.provide === GoogleGenAiCachedContentService),
    ).toBe(true);
    expect(
      providers.some((p) => p.provide === GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN),
    ).toBe(true);
  });

  it("omits cached content provider when disabled", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({
      enableCachedContent: false,
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === GoogleGenAiCachedContentService),
    ).toBe(false);
  });

  it("injects properties via GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    const clientProvider = providers.find(
      (p) => p.provide === GoogleGenAI,
    ) as FactoryProvider;
    const modelProvider = providers.find(
      (p) => p.provide === CHAT_MODEL_TOKEN,
    ) as FactoryProvider;

    expect(clientProvider.inject).toContain(
      GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
    );
    expect(modelProvider.inject).toContain(GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN);
  });

  it("exports feature providers but not the properties token", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({});
    const exports = dynamicModule.exports as symbol[];

    expect(exports).toContain(CHAT_MODEL_TOKEN);
    expect(exports).not.toContain(GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN);
  });

  it("creates GoogleGenAI and GoogleGenAiChatModel from properties", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    const clientProvider = providers.find(
      (p) => p.provide === GoogleGenAI,
    ) as FactoryProvider;
    const modelProvider = providers.find(
      (p) => p.provide === CHAT_MODEL_TOKEN,
    ) as FactoryProvider;

    const properties: GoogleGenAiChatProperties = {
      apiKey: "test-api-key",
      options: {
        model: "gemini-2.0-flash",
        temperature: 0.2,
        topP: 0.7,
        maxOutputTokens: 128,
      },
    };

    const genAiClient = (
      clientProvider.useFactory as (
        properties: GoogleGenAiChatProperties,
      ) => GoogleGenAI
    )(properties);

    expect(genAiClient.vertexai).toBe(false);

    const chatModel = (
      modelProvider.useFactory as (
        properties: GoogleGenAiChatProperties,
        genAiClient: GoogleGenAI,
      ) => GoogleGenAiChatModel
    )(properties, genAiClient);

    expect(chatModel).toBeInstanceOf(GoogleGenAiChatModel);

    const defaultOptions = chatModel.defaultOptions as GoogleGenAiChatOptions;
    expect(defaultOptions.model).toBe("gemini-2.0-flash");
    expect(defaultOptions.temperature).toBe(0.2);
    expect(defaultOptions.topP).toBe(0.7);
    expect(defaultOptions.maxOutputTokens).toBe(128);
  });

  it("creates vertex ai client when apiKey is not provided", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    const clientProvider = providers.find(
      (p) => p.provide === GoogleGenAI,
    ) as FactoryProvider;

    const properties: GoogleGenAiChatProperties = {
      projectId: "test-project",
      location: "us-central1",
    };

    const genAiClient = (
      clientProvider.useFactory as (
        properties: GoogleGenAiChatProperties,
      ) => GoogleGenAI
    )(properties);

    expect(genAiClient.vertexai).toBe(true);
  });

  it("registers async properties provider via forFeatureAsync", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({ apiKey: "async-key" }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const propertiesProvider = providers.find(
      (p) => p.provide === GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
    ) as FactoryProvider;

    expect(propertiesProvider).toBeDefined();
    expect(propertiesProvider.useFactory).toBeDefined();
  });

  it("always includes cached content provider in forFeatureAsync", () => {
    const dynamicModule = GoogleGenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({ apiKey: "async-key" }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === GoogleGenAiCachedContentService),
    ).toBe(true);
  });
});
