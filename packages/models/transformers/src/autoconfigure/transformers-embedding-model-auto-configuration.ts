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
  EMBEDDING_MODEL_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  createModelObservationHandlerProviders,
  EmbeddingModelObservationConvention,
} from "@nestjs-ai/model";

import { TransformersEmbeddingModel } from "../transformers-embedding-model";
import type {
  TransformersEmbeddingModelConfiguration,
  TransformersEmbeddingModelProperties,
} from "./transformers-embedding-model-properties";

/**
 * Creates a configuration that produces a TransformersEmbeddingModel and registers
 * the default model observation handlers.
 */
export function configureTransformersEmbeddingModel(
  properties: TransformersEmbeddingModelProperties = {},
): TransformersEmbeddingModelConfiguration {
  return {
    providers: [
      ...createModelObservationHandlerProviders(),
      {
        token: EMBEDDING_MODEL_TOKEN,
        useFactory: (
          observationRegistry?: ObservationRegistry,
          observationConvention?: EmbeddingModelObservationConvention,
        ) =>
          createTransformersEmbeddingModel(
            properties,
            observationRegistry,
            observationConvention,
          ),
        inject: [
          { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
          { token: EmbeddingModelObservationConvention, optional: true },
        ],
      },
    ],
  } as TransformersEmbeddingModelConfiguration;
}

export function createTransformersEmbeddingModel(
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
