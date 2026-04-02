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

import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type {
  ChatClientConfiguration,
  ChatModelConfiguration,
  HttpClient,
} from "@nestjs-ai/commons";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MODEL_PROPERTIES_TOKEN,
  CHAT_MODEL_TOKEN,
  HTTP_CLIENT_TOKEN,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NestAiModule } from "../nest-ai.module";
import { NestAiChatClientModule } from "../nest-ai-chat-client.module";
import { NestAiChatModelModule } from "../nest-ai-chat-model.module";

const TEST_HTTP_CLIENT: HttpClient = {
  fetch: async () => new Response(null, { status: 200 }),
};

const CONFIG_TOKEN = Symbol("CONFIG_TOKEN");
const FEATURE_CONFIG_TOKEN = Symbol("FEATURE_CONFIG_TOKEN");
const OPTIONAL_DEPENDENCY_TOKEN = Symbol("OPTIONAL_DEPENDENCY_TOKEN");
const OPTIONAL_RESULT_TOKEN = Symbol("OPTIONAL_RESULT_TOKEN");
const MISSING_ASYNC_PROVIDER_TOKEN = Symbol("MISSING_ASYNC_PROVIDER_TOKEN");
const FEATURE_CONSUMER_TOKEN = Symbol("FEATURE_CONSUMER_TOKEN");

@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useValue: {
        httpClient: TEST_HTTP_CLIENT,
      },
    },
  ],
  exports: [CONFIG_TOKEN],
})
class ConfigModule {}

@Module({
  providers: [
    {
      provide: FEATURE_CONFIG_TOKEN,
      useValue: {
        modelName: "async-chat-model",
      },
    },
  ],
  exports: [FEATURE_CONFIG_TOKEN],
})
class FeatureConfigModule {}

@Module({
  imports: [
    NestAiModule.forRoot({
      global: false,
      httpClient: TEST_HTTP_CLIENT,
    }),
    NestAiModule.forFeature(
      {
        providers: [
          {
            token: CHAT_MODEL_TOKEN,
            useFactory: () => "shared-chat-model",
          },
        ],
      } as unknown as ChatModelConfiguration,
      {
        providers: [
          {
            token: CHAT_CLIENT_CUSTOMIZER_TOKEN,
            useFactory: () => ["shared-customizer"],
          },
          {
            token: CHAT_CLIENT_BUILDER_TOKEN,
            useFactory: (chatModel: string) => ({
              chatModel,
              createdAt: Symbol("shared-builder"),
            }),
            inject: [CHAT_MODEL_TOKEN],
            scope: "TRANSIENT",
          },
        ],
      } as unknown as ChatClientConfiguration,
    ),
  ],
  exports: [NestAiModule],
})
class SharedAiModule {}

@Module({
  imports: [SharedAiModule],
  providers: [
    {
      provide: FEATURE_CONSUMER_TOKEN,
      useFactory: (
        httpClient: HttpClient,
        chatModel: string,
        chatClientBuilder: { chatModel: string; createdAt: symbol },
      ) => ({
        httpClient,
        chatModel,
        chatClientBuilder,
      }),
      inject: [HTTP_CLIENT_TOKEN, CHAT_MODEL_TOKEN, CHAT_CLIENT_BUILDER_TOKEN],
    },
  ],
})
class ConsumerModule {}

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

  it("uses explicit HTTP client when provided in forRoot", () => {
    const dynamicModule = NestAiModule.forRoot({
      httpClient: TEST_HTTP_CLIENT,
    });
    const providers = dynamicModule.providers ?? [];

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
        "useValue" in httpClientProvider
        ? httpClientProvider.useValue
        : undefined,
    ).toBe(TEST_HTTP_CLIENT);
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

  it("supports async root configuration with imports and inject", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiModule.forRootAsync({
          imports: [ConfigModule],
          inject: [CONFIG_TOKEN],
          useFactory: (config: { httpClient: HttpClient }) => ({
            httpClient: config.httpClient,
          }),
        }),
      ],
    }).compile();

    expect(testingModule.get(HTTP_CLIENT_TOKEN)).toBe(TEST_HTTP_CLIENT);
  });

  it("uses async module global option when provided", () => {
    const dynamicModule = NestAiModule.forRootAsync({
      useFactory: () => ({
        httpClient: TEST_HTTP_CLIENT,
      }),
      global: false,
    });

    expect(dynamicModule.global).toBe(false);
  });

  it("supports async feature configuration with imports and inject", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiModule.forFeatureAsync({
          imports: [FeatureConfigModule],
          inject: [FEATURE_CONFIG_TOKEN],
          providers: [{ token: CHAT_MODEL_TOKEN }],
          useFactory: (config: { modelName: string }) =>
            ({
              providers: [
                {
                  token: CHAT_MODEL_TOKEN,
                  useFactory: () => config.modelName,
                },
              ],
            }) as unknown as ChatModelConfiguration,
        }),
      ],
    }).compile();

    expect(testingModule.get(CHAT_MODEL_TOKEN)).toBe("async-chat-model");
  });

  it("supports async feature provider scopes", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiModule.forFeatureAsync({
          providers: [
            {
              token: CHAT_CLIENT_BUILDER_TOKEN,
              scope: "TRANSIENT",
            },
          ],
          useFactory: () =>
            ({
              providers: [
                {
                  token: CHAT_CLIENT_BUILDER_TOKEN,
                  useFactory: () => ({ createdAt: Symbol("builder") }),
                  scope: "TRANSIENT",
                },
              ],
            }) as unknown as ChatClientConfiguration,
        }),
      ],
    }).compile();

    const firstBuilder = await testingModule.resolve(CHAT_CLIENT_BUILDER_TOKEN);
    const secondBuilder = await testingModule.resolve(
      CHAT_CLIENT_BUILDER_TOKEN,
    );

    expect(firstBuilder).not.toBe(secondBuilder);
  });

  it("supports optional async feature dependencies", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiModule.forFeatureAsync({
          providers: [
            {
              token: OPTIONAL_RESULT_TOKEN,
              inject: [
                { token: OPTIONAL_DEPENDENCY_TOKEN, optional: true },
              ],
            },
          ],
          useFactory: () =>
            ({
              providers: [
                {
                  token: OPTIONAL_RESULT_TOKEN,
                  useFactory: (dependency?: string) => dependency ?? "fallback",
                },
              ],
            }) as unknown as ChatModelConfiguration,
        }),
      ],
    }).compile();

    expect(testingModule.get(OPTIONAL_RESULT_TOKEN)).toBe("fallback");
  });

  it("throws a clear error when async feature descriptors are incomplete", async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          NestAiModule.forFeatureAsync({
            providers: [{ token: MISSING_ASYNC_PROVIDER_TOKEN }],
            useFactory: () =>
              ({
                providers: [
                  {
                    token: CHAT_MODEL_TOKEN,
                    useFactory: () => "actual-provider",
                  },
                ],
              }) as unknown as ChatModelConfiguration,
          }),
        ],
      }).compile(),
    ).rejects.toThrow(
      `Missing async Nest AI feature provider for token ${String(MISSING_ASYNC_PROVIDER_TOKEN)}`,
    );
  });

  it("resolves root and feature providers through a shared module when global is false", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    const consumer = await testingModule.resolve<{
      httpClient: HttpClient;
      chatModel: string;
      chatClientBuilder: { chatModel: string; createdAt: symbol };
    }>(FEATURE_CONSUMER_TOKEN);
    const anotherBuilder = await testingModule.resolve(
      CHAT_CLIENT_BUILDER_TOKEN,
    );

    expect(consumer.httpClient).toBe(TEST_HTTP_CLIENT);
    expect(consumer.chatModel).toBe("shared-chat-model");
    expect(consumer.chatClientBuilder.chatModel).toBe("shared-chat-model");
    expect(consumer.chatClientBuilder).not.toBe(anotherBuilder);
  });

  it("registers chat model through typed wrapper module", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiChatModelModule.forFeature({
          providers: [
            {
              token: CHAT_MODEL_TOKEN,
              useFactory: () => "wrapped-chat-model",
            },
          ],
        } as unknown as ChatModelConfiguration),
      ],
    }).compile();

    expect(testingModule.get(CHAT_MODEL_TOKEN)).toBe("wrapped-chat-model");
  });

  it("registers chat client through typed wrapper module", async () => {
    const chatModelModule = NestAiChatModelModule.forFeature({
      providers: [
        {
          token: CHAT_MODEL_TOKEN,
          useFactory: () => "wrapped-chat-model",
        },
      ],
    } as unknown as ChatModelConfiguration);

    const testingModule = await Test.createTestingModule({
      imports: [
        chatModelModule,
        NestAiChatClientModule.forFeature(
          {
            providers: [
              {
                token: CHAT_CLIENT_CUSTOMIZER_TOKEN,
                useFactory: () => ["customizer"],
              },
              {
                token: CHAT_CLIENT_BUILDER_TOKEN,
                useFactory: (chatModel: string) => ({
                  chatModel,
                  createdAt: Symbol("builder"),
                }),
                inject: [CHAT_MODEL_TOKEN],
                scope: "TRANSIENT",
              },
            ],
          } as unknown as ChatClientConfiguration,
          { imports: [chatModelModule] },
        ),
      ],
    }).compile();

    const firstBuilder = await testingModule.resolve(CHAT_CLIENT_BUILDER_TOKEN);
    const secondBuilder = await testingModule.resolve(
      CHAT_CLIENT_BUILDER_TOKEN,
    );

    expect(firstBuilder.chatModel).toBe("wrapped-chat-model");
    expect(firstBuilder).not.toBe(secondBuilder);
  });

  it("registers chat client through typed async wrapper module", async () => {
    const chatModelModule = NestAiChatModelModule.forFeature({
      providers: [
        {
          token: CHAT_MODEL_TOKEN,
          useFactory: () => "wrapped-chat-model",
        },
      ],
    } as unknown as ChatModelConfiguration);

    const chatClientConfiguration = {
      providers: [
        {
          token: CHAT_CLIENT_CUSTOMIZER_TOKEN,
          useFactory: () => ["customizer"],
        },
        {
          token: CHAT_CLIENT_BUILDER_TOKEN,
          useFactory: (chatModel: string) => ({
            chatModel,
            createdAt: Symbol("builder"),
          }),
          inject: [CHAT_MODEL_TOKEN],
          scope: "TRANSIENT",
        },
      ],
    } as unknown as ChatClientConfiguration;

    const testingModule = await Test.createTestingModule({
      imports: [
        chatModelModule,
        NestAiChatClientModule.forFeatureAsync({
          configuration: chatClientConfiguration,
          imports: [chatModelModule],
        }),
      ],
    }).compile();

    const firstBuilder = await testingModule.resolve(CHAT_CLIENT_BUILDER_TOKEN);
    const secondBuilder = await testingModule.resolve(
      CHAT_CLIENT_BUILDER_TOKEN,
    );

    expect(firstBuilder.chatModel).toBe("wrapped-chat-model");
    expect(firstBuilder).not.toBe(secondBuilder);
  });

  it("registers chat model through async wrapper with properties token", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        NestAiChatModelModule.forFeatureAsync({
          configuration: {
            providers: [
              {
                token: CHAT_MODEL_TOKEN,
                useFactory: (props: { modelName: string }) => props.modelName,
                inject: [CHAT_MODEL_PROPERTIES_TOKEN],
              },
            ],
          } as unknown as ChatModelConfiguration,
          imports: [FeatureConfigModule],
          inject: [FEATURE_CONFIG_TOKEN],
          useFactory: (config: { modelName: string }) => config,
        }),
      ],
    }).compile();

    expect(testingModule.get(CHAT_MODEL_TOKEN)).toBe("async-chat-model");
  });

  it("registers chat client providers and exports", () => {
    const CHAT_CLIENT_TOKEN = Symbol("CHAT_CLIENT_TOKEN");
    const dynamicModule = NestAiModule.forFeature({
      providers: [
        {
          token: CHAT_CLIENT_TOKEN,
          useFactory: () => "chat-client",
        },
      ],
    } as unknown as ChatClientConfiguration);
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

  it("registers multiple feature configurations in a single forFeature call", () => {
    const CHAT_MODEL_TOKEN = Symbol("CHAT_MODEL_TOKEN");
    const CHAT_CLIENT_TOKEN = Symbol("CHAT_CLIENT_TOKEN");
    const dynamicModule = NestAiModule.forFeature(
      {
        providers: [
          {
            token: CHAT_MODEL_TOKEN,
            useFactory: () => "chat-model",
          },
        ],
      } as unknown as ChatModelConfiguration,
      {
        providers: [
          {
            token: CHAT_CLIENT_TOKEN,
            useFactory: () => "chat-client",
          },
        ],
      } as unknown as ChatClientConfiguration,
    );

    expect(dynamicModule.exports).toContain(CHAT_MODEL_TOKEN);
    expect(dynamicModule.exports).toContain(CHAT_CLIENT_TOKEN);
  });

  it("uses module global option when provided", () => {
    const dynamicModule = NestAiModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });

  it("keeps first provider when duplicate token is configured", () => {
    const dynamicModule = NestAiModule.forFeature({
      providers: [
        {
          token: PROVIDER_INSTANCE_EXPLORER_TOKEN,
          useFactory: () => "override",
        },
      ],
    } as unknown as ObservationConfiguration);

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
});
