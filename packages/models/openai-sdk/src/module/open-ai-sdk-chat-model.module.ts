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
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  ChatModelObservationConvention,
  DefaultToolExecutionEligibilityPredicate,
  ModelObservationModule,
  TOOL_CALLING_MANAGER_TOKEN,
  type ToolCallingManager,
  ToolCallingModule,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { OpenAiSdkChatModel } from "../open-ai-sdk-chat-model";
import { OpenAiSdkChatOptions } from "../open-ai-sdk-chat-options";
import {
  OPEN_AI_SDK_CHAT_DEFAULT_MODEL,
  type OpenAiSdkChatProperties,
} from "./open-ai-sdk-chat-properties";

export const OPEN_AI_SDK_CHAT_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_SDK_CHAT_PROPERTIES_TOKEN",
);

export interface OpenAiSdkChatModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiSdkChatProperties> | OpenAiSdkChatProperties;
  global?: boolean;
}

@Module({})
export class OpenAiSdkChatModelModule {
  static forFeature(
    properties: OpenAiSdkChatProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiSdkChatModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiSdkChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiSdkChatModelModule,
      imports: [
        ModelObservationModule,
        ToolCallingModule,
        ...(options.imports ?? []),
      ],
      providers: [
        {
          provide: OPEN_AI_SDK_CHAT_PROPERTIES_TOKEN,
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
      provide: CHAT_MODEL_TOKEN,
      useFactory: (
        properties: OpenAiSdkChatProperties,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createOpenAiSdkChatModel(
          properties,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        OPEN_AI_SDK_CHAT_PROPERTIES_TOKEN,
        TOOL_CALLING_MANAGER_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
      ],
    },
  ];
}

function createOpenAiSdkChatModel(
  properties: OpenAiSdkChatProperties,
  toolCallingManager?: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): OpenAiSdkChatModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiSdkChatOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_SDK_CHAT_DEFAULT_MODEL,
  });

  const model = new OpenAiSdkChatModel({
    options: defaultOptions,
    toolCallingManager,
    observationRegistry:
      observationRegistry ?? NoopObservationRegistry.INSTANCE,
    toolExecutionEligibilityPredicate:
      toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate(),
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
