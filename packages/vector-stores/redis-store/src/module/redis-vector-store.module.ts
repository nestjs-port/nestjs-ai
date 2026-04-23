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
import { createClient, type RedisClientType } from "redis";
import { RedisVectorStore } from "../redis-vector-store.js";

import type { RedisVectorStoreProperties } from "./redis-vector-store-properties.js";

export const REDIS_VECTOR_STORE_PROPERTIES_TOKEN = Symbol.for(
  "REDIS_VECTOR_STORE_PROPERTIES_TOKEN",
);

export interface RedisVectorStoreModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<RedisVectorStoreProperties> | RedisVectorStoreProperties;
  global?: boolean;
}

@Module({})
export class RedisVectorStoreModule {
  static forFeature(
    properties: RedisVectorStoreProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return RedisVectorStoreModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: RedisVectorStoreModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: RedisVectorStoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
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
      provide: VECTOR_STORE_TOKEN,
      useFactory: (
        properties: RedisVectorStoreProperties,
        embeddingModel: EmbeddingModel,
        observationRegistry?: ObservationRegistry,
        observationConvention?: VectorStoreObservationConvention,
        batchingStrategy?: BatchingStrategy,
      ) =>
        createRedisVectorStore(
          properties,
          embeddingModel,
          observationRegistry,
          observationConvention,
          batchingStrategy,
        ),
      inject: [
        REDIS_VECTOR_STORE_PROPERTIES_TOKEN,
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

async function createRedisVectorStore(
  properties: RedisVectorStoreProperties,
  embeddingModel: EmbeddingModel,
  observationRegistry?: ObservationRegistry,
  observationConvention?: VectorStoreObservationConvention,
  batchingStrategy?: BatchingStrategy,
): Promise<RedisVectorStore> {
  const redisClient = await resolveRedisClient(properties);

  const builder = RedisVectorStore.builder(redisClient, embeddingModel);

  applyRedisVectorStoreProperties(builder, properties);
  if (observationRegistry != null) {
    builder.observationRegistry(observationRegistry);
  }
  if (observationConvention != null) {
    builder.customObservationConvention(observationConvention);
  }
  if (batchingStrategy != null) {
    builder.batchingStrategy(batchingStrategy);
  }

  return builder.build();
}

async function resolveRedisClient(
  properties: RedisVectorStoreProperties,
): Promise<RedisClientType> {
  const client = properties.client;
  if (client != null) {
    if (client.isOpen) {
      return client;
    }

    await client.connect();
    return client;
  }

  if (properties.clientOptions != null) {
    const createdClient = createClient(
      properties.clientOptions,
    ) as RedisClientType;
    await createdClient.connect();
    return createdClient;
  }

  throw new Error("Redis vector store client or clientOptions must be set");
}

function applyRedisVectorStoreProperties(
  builder: ReturnType<typeof RedisVectorStore.builder>,
  properties: RedisVectorStoreProperties,
): void {
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.indexName != null) {
    builder.indexName(properties.indexName);
  }
  if (properties.prefix != null) {
    builder.prefix(properties.prefix);
  }
  if (properties.contentFieldName != null) {
    builder.contentFieldName(properties.contentFieldName);
  }
  if (properties.embeddingFieldName != null) {
    builder.embeddingFieldName(properties.embeddingFieldName);
  }
  if (properties.vectorAlgorithm != null) {
    builder.vectorAlgorithm(properties.vectorAlgorithm);
  }
  if (properties.distanceMetric != null) {
    builder.distanceMetric(properties.distanceMetric);
  }
  if (properties.metadataFields != null) {
    builder.metadataFields(...properties.metadataFields);
  }
  if (properties.hnsw?.m != null) {
    builder.hnswM(properties.hnsw.m);
  }
  if (properties.hnsw?.efConstruction != null) {
    builder.hnswEfConstruction(properties.hnsw.efConstruction);
  }
  if (properties.hnsw?.efRuntime != null) {
    builder.hnswEfRuntime(properties.hnsw.efRuntime);
  }
  if (properties.defaultRangeThreshold != null) {
    builder.defaultRangeThreshold(properties.defaultRangeThreshold);
  }
  if (properties.textScorer != null) {
    builder.textScorer(properties.textScorer);
  }
  if (properties.inOrder != null) {
    builder.inOrder(properties.inOrder);
  }
  if (properties.stopwords != null) {
    builder.stopwords(new Set(properties.stopwords));
  }
}
