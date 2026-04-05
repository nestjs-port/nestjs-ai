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
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  CHAT_MODEL_TOKEN,
  HTTP_CLIENT_TOKEN,
  type HttpClient,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  ChatModelObservationConvention,
  ModelObservationModule,
  TOOL_CALLING_MANAGER_TOKEN,
  type ToolCallingManager,
  ToolCallingModule,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { OpenAiApi } from "../api";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";
import type { OpenAiChatProperties } from "./open-ai-properties";

export const OPEN_AI_CHAT_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_CHAT_PROPERTIES_TOKEN",
);

export interface OpenAiChatModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiChatProperties> | OpenAiChatProperties;
  global?: boolean;
}

@Module({})
export class OpenAiChatModelModule {
  static forFeature(
    properties: OpenAiChatProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiChatModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiChatModelModule,
      imports: [
        ModelObservationModule,
        ToolCallingModule,
        ...(options.imports ?? []),
      ],
      providers: [
        {
          provide: OPEN_AI_CHAT_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as FactoryProvider).provide),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: OpenAiApi,
      useFactory: (properties: OpenAiChatProperties, httpClient: HttpClient) =>
        createOpenAiApi(properties, httpClient),
      inject: [OPEN_AI_CHAT_PROPERTIES_TOKEN, HTTP_CLIENT_TOKEN],
    },
    {
      provide: CHAT_MODEL_TOKEN,
      useFactory: (
        properties: OpenAiChatProperties,
        openAiApi: OpenAiApi,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createOpenAiChatModel(
          properties,
          openAiApi,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        OPEN_AI_CHAT_PROPERTIES_TOKEN,
        OpenAiApi,
        TOOL_CALLING_MANAGER_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
      ],
    },
  ];
}

function createOpenAiChatModel(
  properties: OpenAiChatProperties,
  openAiApi: OpenAiApi,
  toolCallingManager: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): OpenAiChatModel {
  const builder = OpenAiChatModel.builder().openAiApi(openAiApi);

  if (properties.options) {
    builder.defaultOptions(new OpenAiChatOptions(properties.options));
  }
  if (observationRegistry) {
    builder.observationRegistry(observationRegistry);
  }
  if (toolCallingManager) {
    builder.toolCallingManager(toolCallingManager);
  }
  if (toolExecutionEligibilityPredicate) {
    builder.toolExecutionEligibilityPredicate(
      toolExecutionEligibilityPredicate,
    );
  }

  const model = builder.build();
  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}

function createOpenAiApi(
  properties: OpenAiChatProperties,
  httpClient: HttpClient,
): OpenAiApi {
  const headers = new Headers();
  if (properties.projectId) {
    headers.set("OpenAI-Project", properties.projectId);
  }
  if (properties.organizationId) {
    headers.set("OpenAI-Organization", properties.organizationId);
  }

  const builder = OpenAiApi.builder();

  if (properties.apiKey) {
    builder.apiKey(properties.apiKey);
  }
  if (properties.baseUrl) {
    builder.baseUrl(properties.baseUrl);
  }
  if (properties.completionsPath) {
    builder.completionsPath(properties.completionsPath);
  }

  builder.headers(headers);
  builder.httpClient(httpClient);

  return builder.build();
}
