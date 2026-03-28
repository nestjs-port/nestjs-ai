import {
  BATCHING_STRATEGY_TOKEN,
  EMBEDDING_MODEL_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
  VECTOR_STORE_TOKEN,
  type VectorStoreConfiguration,
} from "@nestjs-ai/commons";
import type { BatchingStrategy, EmbeddingModel } from "@nestjs-ai/model";
import { VectorStoreObservationConvention } from "@nestjs-ai/vector-store";
import { createClient, type RedisClientType } from "redis";
import { RedisVectorStore } from "../redis-vector-store";

import type { RedisVectorStoreProperties } from "./redis-vector-store-properties";

export function configureRedisVectorStore(
  properties: RedisVectorStoreProperties,
): VectorStoreConfiguration {
  return {
    providers: createRedisVectorStoreProviders(properties),
  } as VectorStoreConfiguration;
}

function createRedisVectorStoreProviders(
  properties: RedisVectorStoreProperties,
): VectorStoreConfiguration["providers"] {
  return [
    {
      token: VECTOR_STORE_TOKEN,
      useFactory: createRedisVectorStoreFactory(properties),
      inject: [
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

function createRedisVectorStoreFactory(
  properties: RedisVectorStoreProperties,
): (
  embeddingModel: EmbeddingModel,
  observationRegistry?: ObservationRegistry,
  observationConvention?: VectorStoreObservationConvention,
  batchingStrategy?: BatchingStrategy,
) => Promise<RedisVectorStore> {
  return async (
    embeddingModel: EmbeddingModel,
    observationRegistry?: ObservationRegistry,
    observationConvention?: VectorStoreObservationConvention,
    batchingStrategy?: BatchingStrategy,
  ) => {
    const redisClient = await resolveRedisClient(properties);

    return createRedisVectorStore(
      properties,
      embeddingModel,
      redisClient,
      observationRegistry,
      observationConvention,
      batchingStrategy,
    );
  };
}

function resolveRedisClient(
  properties: RedisVectorStoreProperties,
): RedisClientType | Promise<RedisClientType> {
  if (properties.client != null) {
    return properties.client;
  }

  if (properties.clientOptions != null) {
    const client = createClient(properties.clientOptions) as RedisClientType;
    return client.connect().then(() => client);
  }

  throw new Error("Redis vector store client or clientOptions must be set");
}

function createRedisVectorStore(
  properties: RedisVectorStoreProperties,
  embeddingModel: EmbeddingModel,
  redisClient: RedisClientType,
  observationRegistry?: ObservationRegistry,
  observationConvention?: VectorStoreObservationConvention,
  batchingStrategy?: BatchingStrategy,
): RedisVectorStore {
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
