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
