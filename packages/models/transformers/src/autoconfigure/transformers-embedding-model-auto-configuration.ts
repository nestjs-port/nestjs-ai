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
