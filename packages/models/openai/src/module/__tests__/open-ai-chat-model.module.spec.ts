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

import type { FactoryProvider } from "@nestjs/common";
import type { HttpClient } from "@nestjs-ai/commons";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { OpenAiApi } from "../../api";
import { OpenAiChatModel } from "../../open-ai-chat-model";
import type { OpenAiChatOptions } from "../../open-ai-chat-options";
import {
  OPEN_AI_CHAT_PROPERTIES_TOKEN,
  OpenAiChatModelModule,
} from "../open-ai-chat-model.module";
import type { OpenAiChatProperties } from "../open-ai-properties";

describe("OpenAiChatModelModule", () => {
  it("registers observation, api, and chat model providers via forFeature", () => {
    const dynamicModule = OpenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === OpenAiApi)).toBe(true);
    expect(providers.some((p) => p.provide === CHAT_MODEL_TOKEN)).toBe(true);
    expect(
      providers.some((p) => p.provide === OPEN_AI_CHAT_PROPERTIES_TOKEN),
    ).toBe(true);
  });

  it("injects properties via OPEN_AI_CHAT_PROPERTIES_TOKEN", () => {
    const dynamicModule = OpenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    const apiProvider = providers.find(
      (p) => p.provide === OpenAiApi,
    ) as FactoryProvider;
    const modelProvider = providers.find(
      (p) => p.provide === CHAT_MODEL_TOKEN,
    ) as FactoryProvider;

    expect(apiProvider.inject).toContain(OPEN_AI_CHAT_PROPERTIES_TOKEN);
    expect(modelProvider.inject).toContain(OPEN_AI_CHAT_PROPERTIES_TOKEN);
  });

  it("exports feature providers but not the properties token", () => {
    const dynamicModule = OpenAiChatModelModule.forFeature({});
    const exports = dynamicModule.exports as symbol[];

    expect(exports).toContain(CHAT_MODEL_TOKEN);
    expect(exports).not.toContain(OPEN_AI_CHAT_PROPERTIES_TOKEN);
  });

  it("creates OpenAiApi and OpenAiChatModel from properties", () => {
    const dynamicModule = OpenAiChatModelModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    const apiProvider = providers.find(
      (p) => p.provide === OpenAiApi,
    ) as FactoryProvider;
    const modelProvider = providers.find(
      (p) => p.provide === CHAT_MODEL_TOKEN,
    ) as FactoryProvider;

    const properties: OpenAiChatProperties = {
      apiKey: "test-api-key",
      baseUrl: "https://example.test",
      completionsPath: "/v1/custom/completions",
      projectId: "test-project",
      organizationId: "test-org",
      options: {
        model: "gpt-4.1-mini",
        temperature: 0.2,
        maxTokens: 128,
      },
    };

    const httpClient = {
      fetch: async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: new Headers(),
        }),
    } as unknown as HttpClient;

    const openAiApi = (
      apiProvider.useFactory as (
        properties: OpenAiChatProperties,
        httpClient: HttpClient,
      ) => OpenAiApi
    )(properties, httpClient);

    expect(openAiApi.baseUrl).toBe("https://example.test");
    expect(openAiApi.apiKey.value).toBe("test-api-key");
    expect(openAiApi.completionsPath).toBe("/v1/custom/completions");
    expect(openAiApi.headers.get("OpenAI-Project")).toBe("test-project");
    expect(openAiApi.headers.get("OpenAI-Organization")).toBe("test-org");

    const openAiChatModel = (
      modelProvider.useFactory as (
        properties: OpenAiChatProperties,
        openAiApi: OpenAiApi,
      ) => OpenAiChatModel
    )(properties, openAiApi);

    expect(openAiChatModel).toBeInstanceOf(OpenAiChatModel);

    const defaultOptions = openAiChatModel.defaultOptions as OpenAiChatOptions;
    expect(defaultOptions.model).toBe("gpt-4.1-mini");
    expect(defaultOptions.temperature).toBe(0.2);
    expect(defaultOptions.maxTokens).toBe(128);
  });

  it("registers async properties provider via forFeatureAsync", () => {
    const dynamicModule = OpenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({ apiKey: "async-key" }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const propertiesProvider = providers.find(
      (p) => p.provide === OPEN_AI_CHAT_PROPERTIES_TOKEN,
    ) as FactoryProvider;

    expect(propertiesProvider).toBeDefined();
    expect(propertiesProvider.useFactory).toBeDefined();
  });
});
