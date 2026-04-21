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

import {
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  addToolCallingContentObservationFilter,
  ChatModelObservationConvention,
  DefaultToolExecutionEligibilityPredicate,
  ModelObservationModule,
  TOOL_CALLING_MANAGER_TOKEN,
  type ToolCallingManager,
  ToolCallingModule,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  ObservationFilters,
  type ObservationRegistry,
} from "@nestjs-port/core";
import { AnthropicChatModel } from "../anthropic-chat-model";
import { AnthropicChatOptions } from "../anthropic-chat-options";
import {
  ANTHROPIC_CHAT_DEFAULT_MODEL,
  type AnthropicChatProperties,
} from "./anthropic-chat-properties";

export const ANTHROPIC_CHAT_PROPERTIES_TOKEN = Symbol.for(
  "ANTHROPIC_CHAT_PROPERTIES_TOKEN",
);

export interface AnthropicChatModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<AnthropicChatProperties> | AnthropicChatProperties;
  global?: boolean;
}

@Module({})
export class AnthropicChatModelModule {
  static forFeature(
    properties: AnthropicChatProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return AnthropicChatModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: AnthropicChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: AnthropicChatModelModule,
      imports: [
        ModelObservationModule,
        ToolCallingModule,
        ...(options.imports ?? []),
      ],
      providers: [
        {
          provide: ANTHROPIC_CHAT_PROPERTIES_TOKEN,
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
        properties: AnthropicChatProperties,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
        observationFilters?: ObservationFilters,
      ) =>
        createAnthropicChatModel(
          properties,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
          observationFilters,
        ),
      inject: [
        ANTHROPIC_CHAT_PROPERTIES_TOKEN,
        TOOL_CALLING_MANAGER_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
        { token: ObservationFilters, optional: true },
      ],
    },
  ];
}

function createAnthropicChatModel(
  properties: AnthropicChatProperties,
  toolCallingManager?: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
  observationFilters?: ObservationFilters,
): AnthropicChatModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new AnthropicChatOptions({
    ...connectionProperties,
    ...options,
    model: options?.model ?? ANTHROPIC_CHAT_DEFAULT_MODEL,
    maxTokens: options?.maxTokens ?? AnthropicChatOptions.DEFAULT_MAX_TOKENS,
  });

  const model = new AnthropicChatModel({
    defaultOptions,
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

  addToolCallingContentObservationFilter(
    observationFilters,
    properties.toolCalling,
  );

  return model;
}
