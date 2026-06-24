/*
 * Copyright 2023-present the original author or authors.
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

import assert from "node:assert/strict";

import {
  Document,
  DocumentMetadata,
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { EmbeddingOptions } from "@nestjs-ai/model";
import {
  AbstractObservationVectorStore,
  AbstractVectorStoreBuilder,
  type Filter,
  type FilterExpressionConverter,
  type SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import { LoggerFactory } from "@nestjs-port/core";
import { type JsdbcTemplate, sql } from "@nestjs-port/jsdbc";

import { MariaDBFilterExpressionConverter } from "./maria-db-filter-expression-converter.js";
import { MariaDBSchemaValidator } from "./maria-db-schema-validator.js";

export enum MariaDBDistanceType {
  EUCLIDEAN = "EUCLIDEAN",
  COSINE = "COSINE",
}

/**
 * MariaDB-based vector store implementation using MariaDB's vector search
 * capabilities.
 *
 * The store uses MariaDB's vector search functionality to persist and query
 * vector embeddings along with their associated document content and metadata.
 * It leverages MariaDB's vector index for efficient k-NN search operations.
 *
 * Features:
 * - Automatic schema initialization with configurable index creation
 * - Support for multiple distance functions: cosine and euclidean
 * - Metadata filtering using JSON path expressions
 * - Configurable similarity thresholds for search results
 * - Batch processing support with configurable strategies
 * - Observation and metrics support through Micrometer
 *
 * Basic usage example:
 *
 * ```ts
 * const vectorStore = MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
 *   .initializeSchema(true)
 *   .build();
 *
 * await vectorStore.add([
 *   new Document("content1", { key1: "value1" }),
 *   new Document("content2", { key2: "value2" }),
 * ]);
 *
 * const results = await vectorStore.similaritySearch(
 *   SearchRequest.builder()
 *     .query("search text")
 *     .topK(5)
 *     .similarityThreshold(0.7)
 *     .filterExpression("key1 == 'value1'")
 *     .build(),
 * );
 * ```
 *
 * Advanced configuration example:
 *
 * ```ts
 * const vectorStore = MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
 *   .schemaName("mydb")
 *   .distanceType(MariaDBDistanceType.COSINE)
 *   .dimensions(1536)
 *   .vectorTableName("custom_vectors")
 *   .contentFieldName("text")
 *   .embeddingFieldName("embedding")
 *   .idFieldName("doc_id")
 *   .metadataFieldName("meta")
 *   .initializeSchema(true)
 *   .maxDocumentBatchSize(1_000)
 *   .build();
 * ```
 *
 * Requirements:
 * - MariaDB 11.3.0 or later
 * - A table schema with id (`UUID`), content (`TEXT`), metadata (`JSON`), and
 *   embedding (`VECTOR`) columns
 *
 * Distance functions:
 * - `cosine`: Default, suitable for most use cases. Measures cosine similarity
 *   between vectors.
 * - `euclidean`: Euclidean distance between vectors. Lower values indicate
 *   higher similarity.
 */
export class MariaDBVectorStore extends AbstractObservationVectorStore {
  static readonly OPENAI_EMBEDDING_DIMENSION_SIZE = 1536;

  static readonly INVALID_EMBEDDING_DIMENSION = -1;

  static readonly DEFAULT_SCHEMA_VALIDATION = false;

  static readonly MAX_DOCUMENT_BATCH_SIZE = 10_000;

  static readonly DEFAULT_TABLE_NAME = "vector_store";

  static readonly DEFAULT_COLUMN_EMBEDDING = "embedding";

  static readonly DEFAULT_COLUMN_METADATA = "metadata";

  static readonly DEFAULT_COLUMN_ID = "id";

  static readonly DEFAULT_COLUMN_CONTENT = "content";

  private readonly logger = LoggerFactory.getLogger(MariaDBVectorStore.name);

  readonly filterExpressionConverter: FilterExpressionConverter;

  private readonly _vectorTableName: string;
  private readonly _jdbcTemplate: JsdbcTemplate;
  private readonly _schemaName: string | null;
  private readonly _schemaValidation: boolean;
  private readonly _initializeSchema: boolean;
  private readonly _dimensions: number;
  private readonly _contentFieldName: string;
  private readonly _embeddingFieldName: string;
  private readonly _idFieldName: string;
  private readonly _metadataFieldName: string;
  private readonly _distanceType: MariaDBDistanceType;
  private readonly _removeExistingVectorStoreTable: boolean;
  private readonly _schemaValidator: MariaDBSchemaValidator;
  private readonly _maxDocumentBatchSize: number;
  private _embeddingDimensions: number =
    MariaDBVectorStore.INVALID_EMBEDDING_DIMENSION;

  /**
   * Protected constructor for creating a MariaDBVectorStore instance using the builder
   * pattern.
   * @param builder the builder containing all configuration settings
   */
  constructor(builder: MariaDBVectorStoreBuilder) {
    super({
      embeddingModel: builder.getEmbeddingModel(),
      observationRegistry: builder.getObservationRegistry(),
      customObservationConvention: builder.getCustomObservationConvention(),
      batchingStrategy: builder.getBatchingStrategy(),
    });
    assert(builder.getJdbcTemplate(), "JdbcTemplate must not be null");

    this._vectorTableName =
      builder.getVectorTableName().length === 0
        ? MariaDBVectorStore.DEFAULT_TABLE_NAME
        : MariaDBSchemaValidator.validateAndEnquoteIdentifier(
            builder.getVectorTableName().trim(),
            false,
          );
    this.logger.info(
      `Using the vector table name: ${this._vectorTableName}. Is empty: ${builder.getVectorTableName().length === 0}`,
    );

    const schemaName = builder.getSchemaName();
    this._schemaName =
      schemaName == null
        ? null
        : MariaDBSchemaValidator.validateAndEnquoteIdentifier(
            schemaName,
            false,
          );
    this._schemaValidation = builder.getSchemaValidation();
    this._jdbcTemplate = builder.getJdbcTemplate();
    this._dimensions = builder.getDimensions();
    this._distanceType = builder.getDistanceType();
    this._removeExistingVectorStoreTable =
      builder.getRemoveExistingVectorStoreTable();
    this._initializeSchema = builder.getInitializeSchema();
    this._schemaValidator = new MariaDBSchemaValidator(this._jdbcTemplate);
    this._maxDocumentBatchSize = builder.getMaxDocumentBatchSize();

    this._contentFieldName =
      MariaDBSchemaValidator.validateAndEnquoteIdentifier(
        builder.getContentFieldName(),
        false,
      );
    this._embeddingFieldName =
      MariaDBSchemaValidator.validateAndEnquoteIdentifier(
        builder.getEmbeddingFieldName(),
        false,
      );
    this._idFieldName = MariaDBSchemaValidator.validateAndEnquoteIdentifier(
      builder.getIdFieldName(),
      false,
    );
    this._metadataFieldName =
      MariaDBSchemaValidator.validateAndEnquoteIdentifier(
        builder.getMetadataFieldName(),
        false,
      );
    this.filterExpressionConverter = new MariaDBFilterExpressionConverter(
      this._metadataFieldName,
    );
  }

  /**
   * Creates a new MariaDBBuilder instance. This is the recommended way to instantiate
   * a MariaDBVectorStore.
   */
  static builder(
    jdbcTemplate: JsdbcTemplate,
    embeddingModel: EmbeddingModel,
  ): MariaDBVectorStoreBuilder {
    return new MariaDBVectorStoreBuilder(jdbcTemplate, embeddingModel);
  }

  get distanceType(): MariaDBDistanceType {
    return this._distanceType;
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    // Batch the documents based on the batching strategy
    const embeddings = await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    );

    const batchedDocuments = this.batchDocuments(documents, embeddings);
    for (const batch of batchedDocuments) {
      await this.insertOrUpdateBatch(batch);
    }
  }

  private batchDocuments(
    documents: Document[],
    embeddings: number[][],
  ): MariaDBDocument[][] {
    const batches: MariaDBDocument[][] = [];
    const mariaDBDocuments: MariaDBDocument[] = [];

    if (embeddings.length === documents.length) {
      for (let index = 0; index < documents.length; index++) {
        const document = documents[index];
        mariaDBDocuments.push({
          id: document.id,
          content: document.text,
          metadata: document.metadata,
          embedding: embeddings[index] ?? null,
        });
      }
    } else {
      for (const document of documents) {
        mariaDBDocuments.push({
          id: document.id,
          content: document.text,
          metadata: document.metadata,
          embedding: null,
        });
      }
    }

    for (
      let index = 0;
      index < mariaDBDocuments.length;
      index += this._maxDocumentBatchSize
    ) {
      batches.push(
        mariaDBDocuments.slice(
          index,
          Math.min(index + this._maxDocumentBatchSize, mariaDBDocuments.length),
        ),
      );
    }

    return batches;
  }

  private async insertOrUpdateBatch(batch: MariaDBDocument[]): Promise<void> {
    await this._jdbcTemplate.transaction(async () => {
      for (const document of batch) {
        await this._jdbcTemplate.update(
          sql`INSERT INTO ${() => this.getFullyQualifiedTableName()} (
						${() => this._idFieldName},
						${() => this._contentFieldName},
						${() => this._metadataFieldName},
						${() => this._embeddingFieldName}
					) VALUES (${document.id}, ${document.content}, ${this.toJson(document.metadata)}, ${this.toFloat32Buffer(document.embedding)})
					ON DUPLICATE KEY UPDATE
						${() => this._contentFieldName} = VALUES(${() => this._contentFieldName}),
						${() => this._metadataFieldName} = VALUES(${() => this._metadataFieldName}),
						${() => this._embeddingFieldName} = VALUES(${() => this._embeddingFieldName})`,
        );
      }
    });
  }

  private toJson(map: Record<string, unknown>): string {
    return JSON.stringify(map);
  }

  private toFloat32Buffer(values: number[] | null): Buffer | null {
    if (values == null) {
      return null;
    }

    const buffer = Buffer.alloc(values.length * 4);
    for (let index = 0; index < values.length; index++) {
      buffer.writeFloatLE(values[index], index * 4);
    }
    return buffer;
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    await this._jdbcTemplate.transaction(async () => {
      for (const id of idList) {
        await this._jdbcTemplate.update(
          sql`DELETE FROM ${() => this.getFullyQualifiedTableName()} WHERE ${() => this._idFieldName} = ${id}`,
        );
      }
    });
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    const nativeFilterExpression =
      this.filterExpressionConverter.convertExpression(filterExpression);
    const sqlStatement = `DELETE FROM ${this.getFullyQualifiedTableName()} WHERE ${nativeFilterExpression}`;

    try {
      this.logger.debug(`Executing delete with filter: ${sqlStatement}`);
      await this._jdbcTemplate.update(
        sql`DELETE FROM ${() => this.getFullyQualifiedTableName()} WHERE ${() => nativeFilterExpression}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete documents by filter: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `Failed to delete documents by filter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected override async doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]> {
    const nativeFilterExpression =
      request.filterExpression != null
        ? this.filterExpressionConverter.convertExpression(
            request.filterExpression,
          )
        : "";

    const jsonPathFilter =
      nativeFilterExpression.length > 0
        ? ` AND ${nativeFilterExpression} `
        : "";

    const distance = 1 - request.similarityThreshold;
    const distanceType = this._distanceType.toLowerCase();

    const queryEmbedding = this.toFloat32Buffer(
      await this.getQueryEmbedding(request.query),
    );
    assert(queryEmbedding != null, "Query embedding must not be null");
    const sqlStatement = `SELECT * FROM (
				SELECT
					${this._idFieldName},
					${this._contentFieldName},
					${this._metadataFieldName},
					vec_distance_${distanceType}(${this._embeddingFieldName}, ?) AS distance
				FROM ${this.getFullyQualifiedTableName()}
			) AS t
			WHERE distance < ? ${jsonPathFilter}ORDER BY distance ASC LIMIT ?`;
    this.logger.debug(`SQL query: ${sqlStatement}`);
    const rows = await this._jdbcTemplate.queryForList(
      sql`SELECT * FROM (
				SELECT
					${() => this._idFieldName},
					${() => this._contentFieldName},
					${() => this._metadataFieldName},
					${() => `vec_distance_${distanceType}`}(${() => this._embeddingFieldName}, ${queryEmbedding}) AS distance
				FROM ${() => this.getFullyQualifiedTableName()}
			) AS t
			WHERE distance < ${distance} ${() => jsonPathFilter}ORDER BY distance ASC LIMIT ${request.topK}`,
      (row) => this.mapRow(row),
    );
    return rows as Document[];
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    const embedding = await this._embeddingModel.embed(query);
    return embedding as number[];
  }

  // ---------------------------------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------------------------------
  async onModuleInit(): Promise<void> {
    this.logger.info(
      `Initializing MariaDBVectorStore schema for table: ${this._vectorTableName} in schema: ${this._schemaName}`,
    );

    this.logger.info(`vectorTableValidationsEnabled ${this._schemaValidation}`);

    if (this._schemaValidation) {
      await this._schemaValidator.validateTableSchema(
        this._schemaName,
        this._vectorTableName,
        this._idFieldName,
        this._contentFieldName,
        this._metadataFieldName,
        this._embeddingFieldName,
        await this.embeddingDimensions(),
      );
    }

    if (!this._initializeSchema) {
      this.logger.debug(
        `Skipping the schema initialization for the table: ${this.getFullyQualifiedTableName()}`,
      );
      return;
    }

    if (this._schemaName != null) {
      await this._jdbcTemplate.update(
        sql`CREATE SCHEMA IF NOT EXISTS ${() => this._schemaName}`,
      );
    }

    // Remove existing VectorStoreTable
    if (this._removeExistingVectorStoreTable) {
      await this._jdbcTemplate.update(
        sql`DROP TABLE IF EXISTS ${() => this.getFullyQualifiedTableName()}`,
      );
    }

    const dimensions = await this.embeddingDimensions();
    this._embeddingDimensions = dimensions;
    await this._jdbcTemplate.update(
      sql`CREATE TABLE IF NOT EXISTS ${() => this.getFullyQualifiedTableName()} (
				${() => this._idFieldName} UUID NOT NULL DEFAULT uuid() PRIMARY KEY,
				${() => this._contentFieldName} TEXT,
				${() => this._metadataFieldName} JSON,
				${() => this._embeddingFieldName} VECTOR(${dimensions}) NOT NULL,
				VECTOR INDEX ${() => this.getVectorIndexName()} (${() => this._embeddingFieldName})
			) ENGINE=InnoDB`,
    );
  }

  private getVectorIndexName(): string {
    return `${this._vectorTableName}_${this._embeddingFieldName}`;
  }

  private getFullyQualifiedTableName(): string {
    if (this._schemaName != null) {
      return `${this._schemaName}.${this._vectorTableName}`;
    }
    return this._vectorTableName;
  }

  async embeddingDimensions(): Promise<number> {
    // The manually set dimensions have precedence over the computed one.
    if (this._dimensions > 0) {
      return this._dimensions;
    }

    try {
      const embeddingDimensions = await this._embeddingModel.dimensions();
      if (embeddingDimensions > 0) {
        return embeddingDimensions;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to obtain the embedding dimensions from the embedding model and fall backs to default:${MariaDBVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE}`,
        error,
      );
    }

    return MariaDBVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE;
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    const builder = VectorStoreObservationContext.builder(
      VectorStoreProvider.MARIADB.value,
      operationName,
    )
      .collectionName(this._vectorTableName)
      .dimensions(this.getObservationDimensions())
      .similarityMetric(this.getSimilarityMetric());

    if (this._schemaName != null) {
      builder.namespace(this._schemaName);
    }

    return builder;
  }

  private getObservationDimensions(): number | null {
    if (this._dimensions > 0) {
      return this._dimensions;
    }

    if (this._embeddingDimensions > 0) {
      return this._embeddingDimensions;
    }

    return MariaDBVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE;
  }

  private getSimilarityMetric(): string {
    const metric = SIMILARITY_TYPE_MAPPING.get(this._distanceType);
    return metric != null ? metric.value : this._distanceType;
  }

  override getNativeClient<T>(): T | null {
    return this._jdbcTemplate as unknown as T;
  }

  private mapRow(row: Record<string, unknown>): Document {
    const id = String(this.getRowValue(row, "id"));
    const contentValue = this.getRowValue(row, "content");
    const metadataValue = this.getRowValue(row, "metadata");
    const distance = Number(this.getRowValue(row, "distance"));

    const metadata = this.toMap(metadataValue);
    metadata[DocumentMetadata.DISTANCE] = distance;

    return Document.builder()
      .id(id)
      .text(contentValue == null ? null : String(contentValue))
      .metadata(metadata)
      .score(1.0 - distance)
      .build();
  }

  private getRowValue(row: Record<string, unknown>, name: string): unknown {
    const lowerName = name.toLowerCase();
    const upperName = name.toUpperCase();
    return row[lowerName] ?? row[upperName] ?? row[name];
  }

  private toMap(rawMetadata: unknown): Record<string, unknown> {
    if (rawMetadata == null) {
      return {};
    }

    if (typeof rawMetadata === "string") {
      return JSON.parse(rawMetadata) as Record<string, unknown>;
    }

    if (typeof rawMetadata === "object") {
      return { ...(rawMetadata as Record<string, unknown>) };
    }

    return {};
  }
}

const SIMILARITY_TYPE_MAPPING = new Map<
  MariaDBDistanceType,
  VectorStoreSimilarityMetric
>([
  [MariaDBDistanceType.COSINE, VectorStoreSimilarityMetric.COSINE],
  [MariaDBDistanceType.EUCLIDEAN, VectorStoreSimilarityMetric.EUCLIDEAN],
]);

interface MariaDBDocument {
  id: string;
  content: string | null;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
}

/**
 * Builder for creating instances of {@link MariaDBVectorStore}. This builder
 * provides a fluent API for configuring all aspects of the vector store.
 */
export class MariaDBVectorStoreBuilder extends AbstractVectorStoreBuilder<MariaDBVectorStoreBuilder> {
  private readonly _jdbcTemplate: JsdbcTemplate;
  private _schemaName: string | null = null;
  private _vectorTableName: string = MariaDBVectorStore.DEFAULT_TABLE_NAME;
  private _schemaValidation: boolean =
    MariaDBVectorStore.DEFAULT_SCHEMA_VALIDATION;
  private _dimensions: number = MariaDBVectorStore.INVALID_EMBEDDING_DIMENSION;
  private _distanceType: MariaDBDistanceType = MariaDBDistanceType.COSINE;
  private _removeExistingVectorStoreTable = false;
  private _initializeSchema = false;
  private _maxDocumentBatchSize: number =
    MariaDBVectorStore.MAX_DOCUMENT_BATCH_SIZE;
  private _contentFieldName: string = MariaDBVectorStore.DEFAULT_COLUMN_CONTENT;
  private _embeddingFieldName: string =
    MariaDBVectorStore.DEFAULT_COLUMN_EMBEDDING;
  private _idFieldName: string = MariaDBVectorStore.DEFAULT_COLUMN_ID;
  private _metadataFieldName: string =
    MariaDBVectorStore.DEFAULT_COLUMN_METADATA;

  /**
   * Creates a new builder instance with the required JDBC template.
   */
  constructor(jdbcTemplate: JsdbcTemplate, embeddingModel: EmbeddingModel) {
    super(embeddingModel);
    assert(jdbcTemplate, "JdbcTemplate must not be null");
    this._jdbcTemplate = jdbcTemplate;
  }

  getJdbcTemplate(): JsdbcTemplate {
    return this._jdbcTemplate;
  }

  getSchemaName(): string | null {
    return this._schemaName;
  }

  getVectorTableName(): string {
    return this._vectorTableName;
  }

  getSchemaValidation(): boolean {
    return this._schemaValidation;
  }

  getDimensions(): number {
    return this._dimensions;
  }

  getDistanceType(): MariaDBDistanceType {
    return this._distanceType;
  }

  getRemoveExistingVectorStoreTable(): boolean {
    return this._removeExistingVectorStoreTable;
  }

  getInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  getMaxDocumentBatchSize(): number {
    return this._maxDocumentBatchSize;
  }

  getContentFieldName(): string {
    return this._contentFieldName;
  }

  getEmbeddingFieldName(): string {
    return this._embeddingFieldName;
  }

  getIdFieldName(): string {
    return this._idFieldName;
  }

  getMetadataFieldName(): string {
    return this._metadataFieldName;
  }

  /**
   * Configures the schema name for the vector store table.
   */
  schemaName(schemaName: string | null): this {
    if (schemaName != null) {
      assert(schemaName.trim().length > 0, "SchemaName must not be empty");
    }
    this._schemaName = schemaName;
    return this;
  }

  /**
   * Configures the vector store table name.
   */
  vectorTableName(vectorTableName: string): this {
    assert(
      vectorTableName.trim().length > 0,
      "VectorTableName must not be empty",
    );
    this._vectorTableName = vectorTableName;
    return this;
  }

  /**
   * Configures whether schema validation should be performed.
   */
  schemaValidation(schemaValidation: boolean): this {
    this._schemaValidation = schemaValidation;
    return this;
  }

  /**
   * Configures the dimension size of the embedding vectors.
   */
  dimensions(dimensions: number): this {
    this._dimensions = dimensions;
    return this;
  }

  /**
   * Configures the distance type used for similarity calculations.
   */
  distanceType(distanceType: MariaDBDistanceType): this {
    assert(distanceType != null, "DistanceType must not be null");
    this._distanceType = distanceType;
    return this;
  }

  /**
   * Configures whether to remove any existing vector store table.
   */
  removeExistingVectorStoreTable(
    removeExistingVectorStoreTable: boolean,
  ): this {
    this._removeExistingVectorStoreTable = removeExistingVectorStoreTable;
    return this;
  }

  /**
   * Configures whether to initialize the database schema.
   */
  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  /**
   * Configures the maximum batch size for document operations.
   */
  maxDocumentBatchSize(maxDocumentBatchSize: number): this {
    assert(maxDocumentBatchSize > 0, "MaxDocumentBatchSize must be positive");
    this._maxDocumentBatchSize = maxDocumentBatchSize;
    return this;
  }

  /**
   * Configures the name of the content field in the database.
   */
  contentFieldName(name: string): this {
    assert(name.trim().length > 0, "ContentFieldName must not be empty");
    this._contentFieldName = name;
    return this;
  }

  /**
   * Configures the name of the embedding field in the database.
   */
  embeddingFieldName(name: string): this {
    assert(name.trim().length > 0, "EmbeddingFieldName must not be empty");
    this._embeddingFieldName = name;
    return this;
  }

  /**
   * Configures the name of the ID field in the database.
   */
  idFieldName(name: string): this {
    assert(name.trim().length > 0, "IdFieldName must not be empty");
    this._idFieldName = name;
    return this;
  }

  /**
   * Configures the name of the metadata field in the database.
   */
  metadataFieldName(name: string): this {
    assert(name.trim().length > 0, "MetadataFieldName must not be empty");
    this._metadataFieldName = name;
    return this;
  }

  /**
   * Builds and returns a new MariaDBVectorStore instance with the configured
   * settings.
   */
  override build(): MariaDBVectorStore {
    return new MariaDBVectorStore(this);
  }
}
