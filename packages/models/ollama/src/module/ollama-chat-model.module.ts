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
  type ObservationRegistry,
  type RetryTemplate,
} from "@nestjs-port/core";
import { RetryUtils } from "@nestjs-ai/retry";

import { OllamaApi } from "../api/ollama-api.js";
import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import { ModelManagementOptions } from "../management/model-management-options.js";
import { PullModelStrategy } from "../management/pull-model-strategy.js";
import {
  OLLAMA_CHAT_DEFAULT_MODEL,
  type OllamaChatProperties,
} from "./ollama-chat-properties.js";
import { OllamaApiModule } from "./ollama-api.module.js";

export const OLLAMA_CHAT_MODEL_MODULE_OPTIONS_TOKEN = Symbol.for(
  "OLLAMA_CHAT_MODEL_MODULE_OPTIONS_TOKEN",
);

export interface OllamaChatModelModuleOptions {
  properties: OllamaChatProperties;
  retryTemplate?: RetryTemplate | null;
}

export interface OllamaChatModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OllamaChatModelModuleOptions> | OllamaChatModelModuleOptions;
  global?: boolean;
}

@Module({})
export class OllamaChatModelModule {
  static forFeature(
    properties: OllamaChatProperties,
    options?: {
      imports?: ModuleMetadata["imports"];
      global?: boolean;
      retryTemplate?: RetryTemplate | null;
    },
  ): DynamicModule {
    return OllamaChatModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => ({
        properties,
        retryTemplate: options?.retryTemplate,
      }),
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OllamaChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();
    const imports =
      options.imports != null && options.imports.length > 0
        ? options.imports
        : [OllamaApiModule.forFeature()];

    return {
      module: OllamaChatModelModule,
      imports: [ModelObservationModule, ToolCallingModule, ...imports],
      providers: [
        {
          provide: OLLAMA_CHAT_MODEL_MODULE_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map(
        (provider) => (provider as FactoryProvider).provide,
      ),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: CHAT_MODEL_TOKEN,
      useFactory: (
        moduleOptions: OllamaChatModelModuleOptions,
        ollamaApi: OllamaApi,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createOllamaChatModel(
          moduleOptions,
          ollamaApi,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        OLLAMA_CHAT_MODEL_MODULE_OPTIONS_TOKEN,
        OllamaApi,
        TOOL_CALLING_MANAGER_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
      ],
    },
  ];
}

function createOllamaChatModel(
  moduleOptions: OllamaChatModelModuleOptions,
  ollamaApi: OllamaApi,
  toolCallingManager: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): OllamaChatModel {
  const { properties, retryTemplate } = moduleOptions;
  const {
    options,
    include,
    additionalModels,
    pullModelStrategy,
    timeout,
    maxRetries,
  } = properties;
  const defaultOptions = options?.copy() ?? OllamaChatOptions.builder().build();

  if (defaultOptions.model == null) {
    defaultOptions.setModel(OLLAMA_CHAT_DEFAULT_MODEL);
  }

  const modelManagementOptions = new ModelManagementOptions({
    pullModelStrategy:
      include === false ? PullModelStrategy.NEVER : pullModelStrategy,
    additionalModels,
    timeout,
    maxRetries,
  });

  const model = new OllamaChatModel({
    ollamaApi,
    defaultOptions,
    toolCallingManager,
    observationRegistry:
      observationRegistry ?? NoopObservationRegistry.INSTANCE,
    modelManagementOptions,
    toolExecutionEligibilityPredicate:
      toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate(),
    retryTemplate: retryTemplate ?? RetryUtils.DEFAULT_RETRY_TEMPLATE,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
