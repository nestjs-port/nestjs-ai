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

import type { HttpClient } from "@nestjs-ai/commons";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { OpenAiApi } from "../../api";
import { OpenAiChatModel } from "../../open-ai-chat-model";
import type { OpenAiChatOptions } from "../../open-ai-chat-options";
import { configureOpenAiChatModel } from "../open-ai-chat-model-auto-configuration";

describe("configureOpenAiChatModel", () => {
  it("registers observation, api, and chat model providers", () => {
    const configuration = configureOpenAiChatModel({});
    const providers = configuration.providers ?? [];

    expect(providers).toHaveLength(3);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === OpenAiApi,
      ),
    ).toBe(true);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === CHAT_MODEL_TOKEN,
      ),
    ).toBe(true);
  });

  it("creates OpenAiApi and OpenAiChatModel from properties", () => {
    const configuration = configureOpenAiChatModel({
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
    });

    const providers = configuration.providers ?? [];
    const openAiApiProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === OpenAiApi,
    );
    const chatModelProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === CHAT_MODEL_TOKEN,
    );

    expect(openAiApiProvider).toBeDefined();
    expect(chatModelProvider).toBeDefined();

    const httpClient = {
      fetch: async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: new Headers(),
        }),
    } as unknown as HttpClient;

    const openAiApi = (
      openAiApiProvider as unknown as {
        useFactory: (httpClient: HttpClient) => OpenAiApi;
      }
    ).useFactory(httpClient);

    expect(openAiApi.baseUrl).toBe("https://example.test");
    expect(openAiApi.apiKey.value).toBe("test-api-key");
    expect(openAiApi.completionsPath).toBe("/v1/custom/completions");
    expect(openAiApi.headers.get("OpenAI-Project")).toBe("test-project");
    expect(openAiApi.headers.get("OpenAI-Organization")).toBe("test-org");

    const openAiChatModel = (
      chatModelProvider as unknown as {
        useFactory: (openAiApi: OpenAiApi) => OpenAiChatModel;
      }
    ).useFactory(openAiApi);

    expect(openAiChatModel).toBeInstanceOf(OpenAiChatModel);

    const defaultOptions = openAiChatModel.defaultOptions as OpenAiChatOptions;
    expect(defaultOptions.model).toBe("gpt-4.1-mini");
    expect(defaultOptions.temperature).toBe(0.2);
    expect(defaultOptions.maxTokens).toBe(128);
  });
});
