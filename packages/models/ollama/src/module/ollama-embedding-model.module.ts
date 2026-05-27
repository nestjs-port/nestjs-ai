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
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  EmbeddingModelObservationConvention,
  ModelObservationModule,
} from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-port/core";

import type { OllamaApi } from "../api/ollama-api.js";
import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";
import { ModelManagementOptions } from "../management/model-management-options.js";
import { PullModelStrategy } from "../management/pull-model-strategy.js";
import {
  OLLAMA_EMBEDDING_DEFAULT_MODEL,
  type OllamaEmbeddingProperties,
} from "./ollama-embedding-properties.js";

export const OLLAMA_EMBEDDING_MODEL_MODULE_OPTIONS_TOKEN = Symbol.for(
  "OLLAMA_EMBEDDING_MODEL_MODULE_OPTIONS_TOKEN",
);

export interface OllamaEmbeddingModelModuleOptions {
  ollamaApi: OllamaApi;
  properties: OllamaEmbeddingProperties;
}

export interface OllamaEmbeddingModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<OllamaEmbeddingModelModuleOptions>
    | OllamaEmbeddingModelModuleOptions;
  global?: boolean;
}

@Module({})
export class OllamaEmbeddingModelModule {
  static forFeature(
    ollamaApi: OllamaApi,
    properties: OllamaEmbeddingProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OllamaEmbeddingModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => ({ ollamaApi, properties }),
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OllamaEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OllamaEmbeddingModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: OLLAMA_EMBEDDING_MODEL_MODULE_OPTIONS_TOKEN,
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
      provide: EMBEDDING_MODEL_TOKEN,
      useFactory: (
        moduleOptions: OllamaEmbeddingModelModuleOptions,
        observationRegistry?: ObservationRegistry,
        observationConvention?: EmbeddingModelObservationConvention,
      ) =>
        createOllamaEmbeddingModel(
          moduleOptions,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        OLLAMA_EMBEDDING_MODEL_MODULE_OPTIONS_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: EmbeddingModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createOllamaEmbeddingModel(
  moduleOptions: OllamaEmbeddingModelModuleOptions,
  observationRegistry?: ObservationRegistry,
  observationConvention?: EmbeddingModelObservationConvention,
): OllamaEmbeddingModel {
  const { ollamaApi, properties } = moduleOptions;
  const {
    options,
    include,
    additionalModels,
    pullModelStrategy,
    timeout,
    maxRetries,
  } = properties;
  const defaultOptions = new OllamaEmbeddingOptions({
    ...options,
    model: options?.model ?? OLLAMA_EMBEDDING_DEFAULT_MODEL,
  });

  const modelManagementOptions = new ModelManagementOptions({
    pullModelStrategy:
      include === false ? PullModelStrategy.NEVER : pullModelStrategy,
    additionalModels,
    timeout,
    maxRetries,
  });

  const model = new OllamaEmbeddingModel({
    ollamaApi,
    defaultOptions,
    observationRegistry:
      observationRegistry ?? NoopObservationRegistry.INSTANCE,
    modelManagementOptions,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
