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
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  EMBEDDING_MODEL_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  createModelObservationHandlerProviders,
  EmbeddingModelObservationConvention,
} from "@nestjs-ai/model";
import { TransformersEmbeddingModel } from "../transformers-embedding-model";
import type { TransformersEmbeddingModelProperties } from "./transformers-embedding-model-properties";

export const TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN = Symbol.for(
  "TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN",
);

export interface TransformersEmbeddingModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<TransformersEmbeddingModelProperties>
    | TransformersEmbeddingModelProperties;
  global?: boolean;
}

@Module({})
export class TransformersEmbeddingModelModule {
  static forFeature(
    properties: TransformersEmbeddingModelProperties = {},
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: TransformersEmbeddingModelModule,
      imports: options?.imports ?? [],
      providers: [
        {
          provide: TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
          useValue: properties,
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as { provide: InjectionToken }).provide),
      global: options?.global ?? false,
    };
  }

  static forFeatureAsync(
    options: TransformersEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: TransformersEmbeddingModelModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as { provide: InjectionToken }).provide),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    ...createModelObservationHandlerProviders(),
    {
      provide: EMBEDDING_MODEL_TOKEN,
      useFactory: (
        properties: TransformersEmbeddingModelProperties,
        observationRegistry?: ObservationRegistry,
        observationConvention?: EmbeddingModelObservationConvention,
      ) =>
        createTransformersEmbeddingModel(
          properties,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: EmbeddingModelObservationConvention, optional: true },
      ],
    },
  ];
}
function createTransformersEmbeddingModel(
  properties: TransformersEmbeddingModelProperties,
  observationRegistry?: ObservationRegistry,
  observationConvention?: EmbeddingModelObservationConvention,
): TransformersEmbeddingModel {
  const model = new TransformersEmbeddingModel({
    model: properties.model,
    cacheDir: properties.cache?.directory ?? null,
    quantized: properties.quantized,
    config: properties.config,
    localFilesOnly: properties.localFilesOnly,
    revision: properties.revision,
    metadataMode: properties.metadataMode,
    observationRegistry,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
