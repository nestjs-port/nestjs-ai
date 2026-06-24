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

import { MariaDBVectorStore } from "../maria-db-vector-store.js";
import type { MariaDBVectorStoreProperties } from "./maria-db-vector-store-properties.js";

export const MARIADB_VECTOR_STORE_PROPERTIES_TOKEN = Symbol.for(
  "MARIADB_VECTOR_STORE_PROPERTIES_TOKEN",
);

export interface MariaDBVectorStoreModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<MariaDBVectorStoreProperties> | MariaDBVectorStoreProperties;
  global?: boolean;
}

@Module({})
export class MariaDBVectorStoreModule {
  static forFeature(
    properties: MariaDBVectorStoreProperties = {},
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return MariaDBVectorStoreModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: MariaDBVectorStoreModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: MariaDBVectorStoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MARIADB_VECTOR_STORE_PROPERTIES_TOKEN,
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
        properties: MariaDBVectorStoreProperties,
        template: JsdbcTemplate,
        embeddingModel: EmbeddingModel,
        observationRegistry?: ObservationRegistry,
        observationConvention?: VectorStoreObservationConvention,
        batchingStrategy?: BatchingStrategy,
      ): Promise<MariaDBVectorStore> => {
        const vectorStore = MariaDBVectorStore.builder(
          template,
          embeddingModel,
        );

        applyMariaDBVectorStoreProperties(vectorStore, properties);

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
        MARIADB_VECTOR_STORE_PROPERTIES_TOKEN,
        JSDBC_TEMPLATE,
        EMBEDDING_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: VectorStoreObservationConvention, optional: true },
        { token: BATCHING_STRATEGY_TOKEN, optional: true },
      ],
    },
  ];
}

function applyMariaDBVectorStoreProperties(
  builder: ReturnType<typeof MariaDBVectorStore.builder>,
  properties: MariaDBVectorStoreProperties,
): void {
  if (properties.initializeSchema != null) {
    builder.initializeSchema(properties.initializeSchema);
  }
  if (properties.dimensions != null) {
    builder.dimensions(properties.dimensions);
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
  if (properties.schemaValidation != null) {
    builder.schemaValidation(properties.schemaValidation);
  }
  if (properties.maxDocumentBatchSize != null) {
    builder.maxDocumentBatchSize(properties.maxDocumentBatchSize);
  }
  if (properties.contentFieldName != null) {
    builder.contentFieldName(properties.contentFieldName);
  }
  if (properties.embeddingFieldName != null) {
    builder.embeddingFieldName(properties.embeddingFieldName);
  }
  if (properties.idFieldName != null) {
    builder.idFieldName(properties.idFieldName);
  }
  if (properties.metadataFieldName != null) {
    builder.metadataFieldName(properties.metadataFieldName);
  }
}
