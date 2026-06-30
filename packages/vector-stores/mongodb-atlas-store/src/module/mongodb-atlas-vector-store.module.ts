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
import { MongoClient } from "mongodb";

import { MongoDBAtlasVectorStore } from "../mongodb-atlas-vector-store.js";
import type { MongoDBAtlasVectorStoreProperties } from "./mongodb-atlas-vector-store-properties.js";

export const MONGODB_ATLAS_VECTOR_STORE_PROPERTIES_TOKEN = Symbol.for(
  "MONGODB_ATLAS_VECTOR_STORE_PROPERTIES_TOKEN",
);

export interface MongoDBAtlasVectorStoreModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<MongoDBAtlasVectorStoreProperties>
    | MongoDBAtlasVectorStoreProperties;
  global?: boolean;
}

@Module({})
export class MongoDBAtlasVectorStoreModule {
  static forFeature(
    properties: MongoDBAtlasVectorStoreProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return MongoDBAtlasVectorStoreModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: MongoDBAtlasVectorStoreModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: MongoDBAtlasVectorStoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MONGODB_ATLAS_VECTOR_STORE_PROPERTIES_TOKEN,
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
      useFactory: async (
        properties: MongoDBAtlasVectorStoreProperties,
        embeddingModel: EmbeddingModel,
        observationRegistry?: ObservationRegistry,
        observationConvention?: VectorStoreObservationConvention,
        batchingStrategy?: BatchingStrategy,
      ): Promise<MongoDBAtlasVectorStore> => {
        const mongoClient = await resolveMongoClient(properties);
        const builder = MongoDBAtlasVectorStore.builder(
          mongoClient,
          embeddingModel,
        );

        applyMongoDBAtlasVectorStoreProperties(builder, properties);

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
      },
      inject: [
        MONGODB_ATLAS_VECTOR_STORE_PROPERTIES_TOKEN,
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

async function resolveMongoClient(
  properties: MongoDBAtlasVectorStoreProperties,
): Promise<MongoClient> {
  if (properties.mongoClient != null) {
    await properties.mongoClient.connect();
    return properties.mongoClient;
  }

  if (properties.connectionString != null) {
    const client = new MongoClient(
      properties.connectionString,
      properties.mongoClientOptions,
    );
    await client.connect();
    return client;
  }

  throw new Error(
    "MongoDB Atlas vector store mongoClient or connectionString must be set",
  );
}

function applyMongoDBAtlasVectorStoreProperties(
  builder: ReturnType<typeof MongoDBAtlasVectorStore.builder>,
  properties: MongoDBAtlasVectorStoreProperties,
): void {
  if (properties.collectionName != null) {
    builder.collectionName(properties.collectionName);
  }
  if (properties.dbName != null) {
    builder.dbName(properties.dbName);
  }
  if (properties.indexName != null) {
    builder.indexName(properties.indexName);
  }
  if (properties.pathName != null) {
    builder.pathName(properties.pathName);
  }
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.numCandidates != null) {
    builder.numCandidates(properties.numCandidates);
  }
  if (properties.metadataFieldsToFilter != null) {
    builder.metadataFieldsToFilter(...properties.metadataFieldsToFilter);
  }
}
