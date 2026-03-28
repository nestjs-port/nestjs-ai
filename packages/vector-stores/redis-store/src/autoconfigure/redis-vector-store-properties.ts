import type { RedisClientOptions, RedisClientType } from "redis";

import type { RedisMetadataField } from "../redis-metadata-field";
import type {
  RedisDistanceMetric,
  RedisTextScorer,
  RedisVectorAlgorithm,
} from "../redis-vector-store";

export interface RedisVectorStoreHnswProperties {
  m?: number;
  efConstruction?: number;
  efRuntime?: number;
}

export interface RedisVectorStoreProperties {
  client?: RedisClientType;
  clientOptions?: RedisClientOptions;
  initializeSchema?: boolean;
  indexName?: string;
  prefix?: string;
  contentFieldName?: string;
  embeddingFieldName?: string;
  vectorAlgorithm?: RedisVectorAlgorithm;
  distanceMetric?: RedisDistanceMetric;
  metadataFields?: RedisMetadataField[];
  hnsw?: RedisVectorStoreHnswProperties;
  defaultRangeThreshold?: number | null;
  textScorer?: RedisTextScorer;
  inOrder?: boolean;
  stopwords?: string[];
}
