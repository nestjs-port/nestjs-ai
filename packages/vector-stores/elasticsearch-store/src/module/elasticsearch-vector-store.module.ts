/*
 * Copyright 2026-present the original author or authors.
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
import {
  BATCHING_STRATEGY_TOKEN,
  EMBEDDING_MODEL_TOKEN,
  VECTOR_STORE_TOKEN,
} from "@nestjs-ai/commons";
import type { BatchingStrategy, EmbeddingModel } from "@nestjs-ai/model";
import { VectorStoreObservationConvention } from "@nestjs-ai/vector-store";
import type { ObservationRegistry } from "@nestjs-port/core";
import { OBSERVATION_REGISTRY_TOKEN } from "@nestjs-port/core";

import {
  ElasticsearchVectorStore,
  type ElasticsearchVectorStoreBuilder,
} from "../elasticsearch-vector-store.js";
import type { ElasticsearchVectorStoreProperties } from "./elasticsearch-vector-store-properties.js";

export const ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN = Symbol.for(
  "ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN",
);

export interface ElasticsearchVectorStoreModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<ElasticsearchVectorStoreProperties>
    | ElasticsearchVectorStoreProperties;
  global?: boolean;
}

@Module({})
export class ElasticsearchVectorStoreModule {
  static forFeature(
    properties: ElasticsearchVectorStoreProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return ElasticsearchVectorStoreModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: ElasticsearchVectorStoreModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: ElasticsearchVectorStoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN,
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
      provide: VECTOR_STORE_TOKEN,
      useFactory: (
        properties: ElasticsearchVectorStoreProperties,
        embeddingModel: EmbeddingModel,
        observationRegistry?: ObservationRegistry,
        observationConvention?: VectorStoreObservationConvention,
        batchingStrategy?: BatchingStrategy,
      ): ElasticsearchVectorStore => {
        const vectorStore = createElasticsearchVectorStore(
          properties,
          embeddingModel,
        );

        if (observationRegistry != null) {
          vectorStore.observationRegistry(observationRegistry);
        }
        if (observationConvention != null) {
          vectorStore.customObservationConvention(observationConvention);
        }
        if (batchingStrategy != null) {
          vectorStore.batchingStrategy(batchingStrategy);
        }

        return vectorStore.build();
      },
      inject: [
        ELASTICSEARCH_VECTOR_STORE_PROPERTIES_TOKEN,
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

function createElasticsearchVectorStore(
  properties: ElasticsearchVectorStoreProperties,
  embeddingModel: EmbeddingModel,
): ElasticsearchVectorStoreBuilder {
  if (properties.client == null) {
    throw new Error("Elasticsearch vector store client must be set");
  }

  const builder = ElasticsearchVectorStore.builder(
    properties.client,
    embeddingModel,
  );

  if (
    properties.indexName != null ||
    properties.dimensions != null ||
    properties.similarity != null ||
    properties.embeddingFieldName != null
  ) {
    builder.options(properties);
  }
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.filterExpressionConverter != null) {
    builder.filterExpressionConverter(properties.filterExpressionConverter);
  }

  return builder;
}
