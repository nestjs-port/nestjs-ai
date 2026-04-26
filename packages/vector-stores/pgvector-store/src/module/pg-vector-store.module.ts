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
import type { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { JSDBC_TEMPLATE } from "@nestjs-port/jsdbc";

import { PgVectorStore } from "../pg-vector-store.js";
import type { PgVectorStoreProperties } from "./pg-vector-store-properties.js";

export const PG_VECTOR_STORE_PROPERTIES_TOKEN = Symbol.for(
  "PG_VECTOR_STORE_PROPERTIES_TOKEN",
);

export interface PgVectorStoreModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<PgVectorStoreProperties> | PgVectorStoreProperties;
  global?: boolean;
}

@Module({})
export class PgVectorStoreModule {
  static forFeature(
    properties: PgVectorStoreProperties = {},
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return PgVectorStoreModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: PgVectorStoreModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: PgVectorStoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: PG_VECTOR_STORE_PROPERTIES_TOKEN,
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
        properties: PgVectorStoreProperties,
        template: JsdbcTemplate,
        embeddingModel: EmbeddingModel,
        observationRegistry?: ObservationRegistry,
        observationConvention?: VectorStoreObservationConvention,
        batchingStrategy?: BatchingStrategy,
      ): Promise<PgVectorStore> => {
        const vectorStore = PgVectorStore.builder(template, embeddingModel);

        applyPgVectorStoreProperties(vectorStore, properties);

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
        PG_VECTOR_STORE_PROPERTIES_TOKEN,
        JSDBC_TEMPLATE,
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

function applyPgVectorStoreProperties(
  builder: ReturnType<typeof PgVectorStore.builder>,
  properties: PgVectorStoreProperties,
): void {
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.dimensions != null) {
    builder.dimensions(properties.dimensions);
  }
  if (properties.indexType != null) {
    builder.indexType(properties.indexType);
  }
  if (properties.distanceType != null) {
    builder.distanceType(properties.distanceType);
  }
  if (properties.removeExistingVectorStoreTable != null) {
    builder.removeExistingVectorStoreTable(
      properties.removeExistingVectorStoreTable,
    );
  }
  if (properties.tableName != null) {
    builder.vectorTableName(properties.tableName);
  }
  if (properties.schemaName != null) {
    builder.schemaName(properties.schemaName);
  }
  if (properties.idType != null) {
    builder.idType(properties.idType);
  }
  if (properties.schemaValidation != null) {
    builder.vectorTableValidationsEnabled(properties.schemaValidation);
  }
  if (properties.maxDocumentBatchSize != null) {
    builder.maxDocumentBatchSize(properties.maxDocumentBatchSize);
  }
}
