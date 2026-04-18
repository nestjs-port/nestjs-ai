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
  EMBEDDING_MODEL_TOKEN,
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  EmbeddingModelObservationConvention,
  ModelObservationModule,
} from "@nestjs-ai/model";

import { OpenAiSdkEmbeddingModel } from "../open-ai-sdk-embedding-model";
import { OpenAiSdkEmbeddingOptions } from "../open-ai-sdk-embedding-options";
import { OpenAiSdkSetup, type OpenAiSdkSetupProps } from "../setup";
import {
  OPEN_AI_SDK_EMBEDDING_DEFAULT_MODEL,
  type OpenAiSdkEmbeddingProperties,
} from "./open-ai-sdk-embedding-properties";

export const OPEN_AI_SDK_EMBEDDING_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_SDK_EMBEDDING_PROPERTIES_TOKEN",
);

export interface OpenAiSdkEmbeddingModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiSdkEmbeddingProperties> | OpenAiSdkEmbeddingProperties;
  global?: boolean;
}

@Module({})
export class OpenAiSdkEmbeddingModelModule {
  static forFeature(
    properties: OpenAiSdkEmbeddingProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiSdkEmbeddingModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiSdkEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiSdkEmbeddingModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_SDK_EMBEDDING_PROPERTIES_TOKEN,
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
        properties: OpenAiSdkEmbeddingProperties,
        observationRegistry?: ObservationRegistry,
        observationConvention?: EmbeddingModelObservationConvention,
      ) =>
        createOpenAiSdkEmbeddingModel(
          properties,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        OPEN_AI_SDK_EMBEDDING_PROPERTIES_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: EmbeddingModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createOpenAiSdkEmbeddingModel(
  properties: OpenAiSdkEmbeddingProperties,
  observationRegistry?: ObservationRegistry,
  observationConvention?: EmbeddingModelObservationConvention,
): OpenAiSdkEmbeddingModel {
  const { options, metadataMode, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiSdkEmbeddingOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_SDK_EMBEDDING_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSdkSetup.setupClient(toSetupProps(defaultOptions));

  const model = new OpenAiSdkEmbeddingModel({
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

function toSetupProps(options: OpenAiSdkEmbeddingOptions): OpenAiSdkSetupProps {
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
