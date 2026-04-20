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
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";
import {
  OPEN_AI_CHAT_DEFAULT_MODEL,
  type OpenAiChatProperties,
} from "./open-ai-chat-properties";

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
      provide: CHAT_MODEL_TOKEN,
      useFactory: (
        properties: OpenAiChatProperties,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createOpenAiChatModel(
          properties,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        OPEN_AI_CHAT_PROPERTIES_TOKEN,
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
  toolCallingManager?: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): OpenAiChatModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiChatOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_CHAT_DEFAULT_MODEL,
  });

  const model = new OpenAiChatModel({
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
