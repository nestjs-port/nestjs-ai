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

import type {
  ChatClientConfiguration,
  EmbeddingModelConfiguration,
  VectorStoreConfiguration,
} from "@nestjs-ai/commons";
import {
  HTTP_CLIENT_TOKEN,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NestAiModule } from "../nest-ai.module";

describe("NestAIModule", () => {
  it("registers default HTTP client provider in forRoot", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    expect(dynamicModule.module).toBe(NestAiModule);
    expect(dynamicModule.global).toBe(true);

    const httpClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProvider).toBeDefined();
    expect(
      typeof httpClientProvider === "object" &&
        httpClientProvider !== null &&
        "useValue" in httpClientProvider,
    ).toBe(true);
    expect(exportsList).toContain(HTTP_CLIENT_TOKEN);
  });

  it("registers observation handlers provider and export", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const observationHandlersProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === ObservationHandlers,
    );

    expect(observationHandlersProvider).toBeDefined();
    expect(exportsList).toContain(ObservationHandlers);
  });

  it("registers chat client providers and exports", () => {
    const CHAT_CLIENT_TOKEN = Symbol("CHAT_CLIENT_TOKEN");
    const dynamicModule = NestAiModule.forRoot({
      chatClient: {
        providers: [
          {
            token: CHAT_CLIENT_TOKEN,
            useFactory: () => "chat-client",
          },
        ],
      } as unknown as ChatClientConfiguration,
    });
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const chatClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === CHAT_CLIENT_TOKEN,
    );

    expect(chatClientProvider).toBeDefined();
    expect(exportsList).toContain(CHAT_CLIENT_TOKEN);
  });

  it("registers embedding model providers and exports", () => {
    const EMBEDDING_MODEL_TOKEN = Symbol("EMBEDDING_MODEL_TOKEN");
    const dynamicModule = NestAiModule.forRoot({
      embeddingModel: {
        providers: [
          {
            token: EMBEDDING_MODEL_TOKEN,
            useFactory: () => "embedding-model",
          },
        ],
      } as unknown as EmbeddingModelConfiguration,
    });
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const embeddingModelProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === EMBEDDING_MODEL_TOKEN,
    );

    expect(embeddingModelProvider).toBeDefined();
    expect(exportsList).toContain(EMBEDDING_MODEL_TOKEN);
  });

  it("registers vector store providers and exports", () => {
    const VECTOR_STORE_TOKEN = Symbol("VECTOR_STORE_TOKEN");
    const dynamicModule = NestAiModule.forRoot({
      vectorStore: {
        providers: [
          {
            token: VECTOR_STORE_TOKEN,
            useFactory: () => "vector-store",
          },
        ],
      } as unknown as VectorStoreConfiguration,
    });
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const vectorStoreProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === VECTOR_STORE_TOKEN,
    );

    expect(vectorStoreProvider).toBeDefined();
    expect(exportsList).toContain(VECTOR_STORE_TOKEN);
  });

  it("uses module global option when provided", () => {
    const dynamicModule = NestAiModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });

  it("uses user provider when same token is provided in forRoot options", () => {
    const customHttpClient = { name: "custom-http-client" };
    const dynamicModule = NestAiModule.forRoot({
      providers: [
        {
          provide: HTTP_CLIENT_TOKEN,
          useValue: customHttpClient,
        },
      ],
    });

    const providers = dynamicModule.providers ?? [];
    const httpClientProviders = providers.filter(
      (provider) =>
        typeof provider === "object" &&
        provider != null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProviders).toHaveLength(1);
    expect(
      typeof httpClientProviders[0] === "object" &&
        httpClientProviders[0] != null &&
        "useValue" in httpClientProviders[0]
        ? httpClientProviders[0].useValue
        : undefined,
    ).toBe(customHttpClient);
  });

  it("keeps first provider when duplicate token is configured", () => {
    const dynamicModule = NestAiModule.forRoot({
      observation: {
        providers: [
          {
            token: PROVIDER_INSTANCE_EXPLORER_TOKEN,
            useFactory: () => "override",
          },
        ],
      } as unknown as ObservationConfiguration,
    });

    const providers = dynamicModule.providers ?? [];
    const duplicateProviders = providers.filter(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === PROVIDER_INSTANCE_EXPLORER_TOKEN,
    );

    expect(duplicateProviders).toHaveLength(1);
  });

  it("detects duplicate token from user class shorthand providers", () => {
    class CustomProvider {}

    const dynamicModule = NestAiModule.forRoot({
      providers: [CustomProvider],
      observation: {
        providers: [
          {
            token: CustomProvider,
            useFactory: () => "override",
          },
        ],
      } as unknown as ObservationConfiguration,
    });

    const providers = dynamicModule.providers ?? [];
    const customProviders = providers.filter((provider) => {
      if (typeof provider === "function") {
        return provider === CustomProvider;
      }
      if (typeof provider !== "object" || provider == null) {
        return false;
      }
      return "provide" in provider && provider.provide === CustomProvider;
    });

    expect(customProviders).toHaveLength(1);
    expect(customProviders[0]).toBe(CustomProvider);
  });
});
