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
import type { ObservationRegistry } from "@nestjs-port/core";
import { OBSERVATION_REGISTRY_TOKEN } from "@nestjs-port/core";
import { TransformersEmbeddingModel } from "../transformers-embedding-model.js";
import type { TransformersEmbeddingModelProperties } from "./transformers-embedding-model-properties.js";

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
    return TransformersEmbeddingModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: TransformersEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: TransformersEmbeddingModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
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
