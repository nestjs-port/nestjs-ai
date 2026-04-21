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
import { OpenAiEmbeddingModel } from "../open-ai-embedding-model";
import { OpenAiEmbeddingOptions } from "../open-ai-embedding-options";
import { OpenAiSetup, type OpenAiSetupProps } from "../setup";
import {
  OPEN_AI_EMBEDDING_DEFAULT_MODEL,
  type OpenAiEmbeddingProperties,
} from "./open-ai-embedding-properties";

export const OPEN_AI_EMBEDDING_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_EMBEDDING_PROPERTIES_TOKEN",
);

export interface OpenAiEmbeddingModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiEmbeddingProperties> | OpenAiEmbeddingProperties;
  global?: boolean;
}

@Module({})
export class OpenAiEmbeddingModelModule {
  static forFeature(
    properties: OpenAiEmbeddingProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiEmbeddingModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiEmbeddingModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_EMBEDDING_PROPERTIES_TOKEN,
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
      provide: EMBEDDING_MODEL_TOKEN,
      useFactory: (
        properties: OpenAiEmbeddingProperties,
        observationRegistry?: ObservationRegistry,
        observationConvention?: EmbeddingModelObservationConvention,
      ) =>
        createOpenAiEmbeddingModel(
          properties,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        OPEN_AI_EMBEDDING_PROPERTIES_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: EmbeddingModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createOpenAiEmbeddingModel(
  properties: OpenAiEmbeddingProperties,
  observationRegistry?: ObservationRegistry,
  observationConvention?: EmbeddingModelObservationConvention,
): OpenAiEmbeddingModel {
  const { options, metadataMode, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiEmbeddingOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_EMBEDDING_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSetup.setupClient(toSetupProps(defaultOptions));

  const model = new OpenAiEmbeddingModel({
    openAiClient,
    metadataMode,
    options: defaultOptions,
    observationRegistry:
      observationRegistry ?? NoopObservationRegistry.INSTANCE,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}

function toSetupProps(options: OpenAiEmbeddingOptions): OpenAiSetupProps {
  return {
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    azureADTokenProvider: options.azureADTokenProvider,
    azureDeploymentName: options.deploymentName,
    azureOpenAiServiceVersion: options.microsoftFoundryServiceVersion,
    organizationId: options.organizationId,
    isAzure: options.microsoftFoundry,
    isGitHubModels: options.gitHubModels,
    modelName: options.model,
    timeout: options.timeout,
    maxRetries: options.maxRetries,
    fetchOptions: options.fetchOptions,
    customHeaders: options.customHeaders,
  };
}
