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

import { PgVectorFilterExpressionConverter } from "./pg-vector-filter-expression-converter.js";
import { PgVectorSchemaValidator } from "./pg-vector-schema-validator.js";

export enum PgIndexType {
  NONE = "NONE",
  IVFFLAT = "IVFFLAT",
  HNSW = "HNSW",
}

export enum PgIdType {
  UUID = "UUID",
  TEXT = "TEXT",
  INTEGER = "INTEGER",
  SERIAL = "SERIAL",
  BIGSERIAL = "BIGSERIAL",
}

export class PgDistanceType {
  // NOTE: works only if vectors are normalized to length 1 (like OpenAI
  // embeddings), use inner product for best performance.
  // The Sentence transformers are NOT normalized:
  // https://github.com/UKPLab/sentence-transformers/issues/233
  static readonly EUCLIDEAN_DISTANCE = new PgDistanceType(
    "EUCLIDEAN_DISTANCE",
    "<->",
    "vector_l2_ops",
    "SELECT *, embedding <-> %s AS distance FROM %s WHERE embedding <-> %s < %s %s ORDER BY distance LIMIT %s",
  );

  // NOTE: works only if vectors are normalized to length 1 (like OpenAI
  // embeddings), use inner product for best performance.
  // The Sentence transformers are NOT normalized:
  // https://github.com/UKPLab/sentence-transformers/issues/233
  static readonly NEGATIVE_INNER_PRODUCT = new PgDistanceType(
    "NEGATIVE_INNER_PRODUCT",
    "<#>",
    "vector_ip_ops",
    "SELECT *, (1 + (embedding <#> %s)) AS distance FROM %s WHERE (1 + (embedding <#> %s)) < %s %s ORDER BY distance LIMIT %s",
  );

  static readonly COSINE_DISTANCE = new PgDistanceType(
    "COSINE_DISTANCE",
    "<=>",
    "vector_cosine_ops",
    "SELECT *, embedding <=> %s AS distance FROM %s WHERE embedding <=> %s < %s %s ORDER BY distance LIMIT %s",
  );

  private constructor(
    readonly name: string,
    readonly operator: string,
    readonly index: string,
    readonly similaritySearchSqlTemplate: string,
  ) {}
}

const SIMILARITY_TYPE_MAPPING = new Map<
  PgDistanceType,
  VectorStoreSimilarityMetric
>([
  [PgDistanceType.COSINE_DISTANCE, VectorStoreSimilarityMetric.COSINE],
  [PgDistanceType.EUCLIDEAN_DISTANCE, VectorStoreSimilarityMetric.EUCLIDEAN],
  [PgDistanceType.NEGATIVE_INNER_PRODUCT, VectorStoreSimilarityMetric.DOT],
]);

function toVectorSqlLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export class PgVectorStore extends AbstractObservationVectorStore {
  static readonly OPENAI_EMBEDDING_DIMENSION_SIZE = 1536;

  static readonly INVALID_EMBEDDING_DIMENSION = -1;

  static readonly DEFAULT_TABLE_NAME = "vector_store";

  static readonly DEFAULT_ID_TYPE = PgIdType.UUID;

  static readonly DEFAULT_VECTOR_INDEX_NAME = "spring_ai_vector_index";

  static readonly DEFAULT_SCHEMA_NAME = "public";

  static readonly DEFAULT_SCHEMA_VALIDATION = false;

  static readonly MAX_DOCUMENT_BATCH_SIZE = 10_000;

  private static readonly logger = LoggerFactory.getLogger(PgVectorStore.name);

  readonly filterExpressionConverter: FilterExpressionConverter =
    new PgVectorFilterExpressionConverter();

  private readonly _vectorTableName: string;
  private readonly _vectorIndexName: string;
  private readonly _jdbcTemplate: JsdbcTemplate;
  private readonly _schemaName: string;
  private readonly _idType: PgIdType;
  private readonly _schemaValidation: boolean;
  private readonly _initializeSchema: boolean;
  private readonly _dimensions: number;
  private readonly _distanceType: PgDistanceType;
  private readonly _removeExistingVectorStoreTable: boolean;
  private readonly _createIndexMethod: PgIndexType;
  private readonly _schemaValidator: PgVectorSchemaValidator;
  private readonly _maxDocumentBatchSize: number;

  constructor(builder: PgVectorStoreBuilder) {
    super({
      embeddingModel: builder.embeddingModel,
      observationRegistry: builder.configuredObservationRegistry,
      customObservationConvention: builder.configuredObservationConvention,
      batchingStrategy: builder.configuredBatchingStrategy,
    });
    assert(builder.configuredJdbcTemplate, "JdbcTemplate must not be null");

    const vectorTable = builder.configuredVectorTableName;
    this._vectorTableName =
      vectorTable.length === 0
        ? PgVectorStore.DEFAULT_TABLE_NAME
        : vectorTable.trim();
    PgVectorStore.logger.info(
      `Using the vector table name: ${this._vectorTableName}. Is empty: ${this._vectorTableName.length === 0}`,
    );

    this._vectorIndexName =
      this._vectorTableName === PgVectorStore.DEFAULT_TABLE_NAME
        ? PgVectorStore.DEFAULT_VECTOR_INDEX_NAME
        : `${this._vectorTableName}_index`;

    this._schemaName = builder.configuredSchemaName;
    this._idType = builder.configuredIdType;
    this._schemaValidation = builder.configuredVectorTableValidationsEnabled;

    this._jdbcTemplate = builder.configuredJdbcTemplate;
    this._dimensions = builder.configuredDimensions;
    this._distanceType = builder.configuredDistanceType;
    this._removeExistingVectorStoreTable =
      builder.configuredRemoveExistingVectorStoreTable;
    this._createIndexMethod = builder.configuredIndexType;
    this._initializeSchema = builder.configuredInitializeSchema;
    this._schemaValidator = new PgVectorSchemaValidator(this._jdbcTemplate);
    this._maxDocumentBatchSize = builder.configuredMaxDocumentBatchSize;
  }

  get distanceType(): PgDistanceType {
    return this._distanceType;
  }

  static builder(
    jdbcTemplate: JsdbcTemplate,
    embeddingModel: EmbeddingModel,
  ): PgVectorStoreBuilder {
    return new PgVectorStoreBuilder(jdbcTemplate, embeddingModel);
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    const embeddings = await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    );

    const batchedDocuments = this.batchDocuments(documents);
    for (const batch of batchedDocuments) {
      await this.insertOrUpdateBatch(batch, documents, embeddings);
    }
  }

  private batchDocuments(documents: Document[]): Document[][] {
    const batches: Document[][] = [];
    for (let i = 0; i < documents.length; i += this._maxDocumentBatchSize) {
      batches.push(
        documents.slice(
          i,
          Math.min(i + this._maxDocumentBatchSize, documents.length),
        ),
      );
    }
    return batches;
  }

  private async insertOrUpdateBatch(
    batch: Document[],
    documents: Document[],
    embeddings: number[][],
  ): Promise<void> {
    const table = this.getFullyQualifiedTableName();
    await this._jdbcTemplate.transaction(async () => {
      for (const document of batch) {
        const id = this.convertIdToPgType(document.id);
        const content = document.text;
        const json = this.toJson(document.metadata);
        const embedding = toVectorSqlLiteral(
          embeddings[documents.indexOf(document)],
        );

        await this._jdbcTemplate.update(
          sql`INSERT INTO ${() => table} (id, content, metadata, embedding) VALUES (${id}, ${content}, ${json}::jsonb, ${embedding}::vector) ON CONFLICT (id) DO UPDATE SET content = ${content}, metadata = ${json}::jsonb, embedding = ${embedding}::vector`,
        );
      }
    });
  }

  private toJson(map: Record<string, unknown>): string {
    return JSON.stringify(map);
  }

  private convertIdToPgType(id: string): unknown {
    switch (this._idType) {
      case PgIdType.UUID:
        return id;
      case PgIdType.TEXT:
        return id;
      case PgIdType.INTEGER:
      case PgIdType.SERIAL:
        return Number.parseInt(id, 10);
      case PgIdType.BIGSERIAL:
        return BigInt(id);
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    const table = this.getFullyQualifiedTableName();
    await this._jdbcTemplate.transaction(async () => {
      for (const id of idList) {
        await this._jdbcTemplate.update(
          sql`DELETE FROM ${() => table} WHERE id = ${this.convertIdToPgType(id)}`,
        );
      }
    });
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    const nativeFilterExpression =
      this.filterExpressionConverter.convertExpression(filterExpression);

    const table = this.getFullyQualifiedTableName();

    // Execute the delete
    try {
      await this._jdbcTemplate.update(
        sql`DELETE FROM ${() => table} WHERE metadata::jsonb @@ ${() => `'${nativeFilterExpression}'`}::jsonpath`,
      );
    } catch (e) {
      throw new Error(
        `Failed to delete documents by filter: ${e instanceof Error ? e.message : String(e)}`,
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
        ? ` AND metadata::jsonb @@ '${nativeFilterExpression}'::jsonpath `
        : "";

    const distance = 1 - request.similarityThreshold;

    const queryEmbedding = await this.getQueryEmbedding(request.query);
    const table = this.getFullyQualifiedTableName();

    const rows = await this._jdbcTemplate.queryForList(
      sql`SELECT *, embedding ${() => this._distanceType.operator} ${queryEmbedding}::vector AS distance FROM ${() => table} WHERE embedding ${() => this._distanceType.operator} ${queryEmbedding}::vector < ${distance} ${() => jsonPathFilter} ORDER BY distance LIMIT ${request.topK}`,
    );

    return rows.map((row) => this.mapRow(row));
  }

  async embeddingDistance(query: string): Promise<number[]> {
    const queryEmbedding = await this.getQueryEmbedding(query);
    const table = this.getFullyQualifiedTableName();
    const rows = await this._jdbcTemplate.queryForList(
      sql`SELECT embedding ${() => this.comparisonOperator()} ${queryEmbedding}::vector AS distance FROM ${() => table}`,
    );
    return rows.map((row) => Number(row.distance));
  }

  private async getQueryEmbedding(query: string): Promise<string> {
    const embedding = await this._embeddingModel.embed(query);
    return toVectorSqlLiteral(embedding);
  }

  private comparisonOperator(): string {
    return this._distanceType.operator;
  }

  // ---------------------------------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------------------------------
  async onModuleInit(): Promise<void> {
    PgVectorStore.logger.info(
      `Initializing PGVectorStore schema for table: ${this._vectorTableName} in schema: ${this._schemaName}`,
    );

    PgVectorStore.logger.info(
      `vectorTableValidationsEnabled ${this._schemaValidation}`,
    );

    if (this._schemaValidation) {
      await this._schemaValidator.validateTableSchema(
        this._schemaName,
        this._vectorTableName,
      );
    }

    if (!this._initializeSchema) {
      PgVectorStore.logger.debug(
        `Skipping the schema initialization for the table: ${this.getFullyQualifiedTableName()}`,
      );
      return;
    }

    // Enable the PGVector, JSONB and UUID support.
    await this._jdbcTemplate.update(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    await this._jdbcTemplate.update(sql`CREATE EXTENSION IF NOT EXISTS hstore`);

    if (this._idType === PgIdType.UUID) {
      await this._jdbcTemplate.update(
        sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      );
    }

    await this._jdbcTemplate.update(
      sql`CREATE SCHEMA IF NOT EXISTS ${() => this._schemaName}`,
    );

    // Remove existing VectorStoreTable
    if (this._removeExistingVectorStoreTable) {
      await this._jdbcTemplate.update(
        sql`DROP TABLE IF EXISTS ${() => this.getFullyQualifiedTableName()}`,
      );
    }

    const dimensions = await this.embeddingDimensions();
    await this._jdbcTemplate.update(
      sql`CREATE TABLE IF NOT EXISTS ${() => this.getFullyQualifiedTableName()} (
        id ${() => this.getColumnTypeName()} PRIMARY KEY,
        content text,
        metadata json,
        embedding vector(${() => String(dimensions)})
      )`,
    );

    if (this._createIndexMethod !== PgIndexType.NONE) {
      await this._jdbcTemplate.update(
        sql`CREATE INDEX IF NOT EXISTS ${() => this._vectorIndexName} ON ${() => this.getFullyQualifiedTableName()} USING ${() => this._createIndexMethod} (embedding ${() => this._distanceType.index})`,
      );
    }
  }

  private getFullyQualifiedTableName(): string {
    return `${this._schemaName}.${this._vectorTableName}`;
  }

  private getColumnTypeName(): string {
    switch (this._idType) {
      case PgIdType.UUID:
        return "uuid DEFAULT uuid_generate_v4()";
      case PgIdType.TEXT:
        return "text";
      case PgIdType.INTEGER:
        return "integer";
      case PgIdType.SERIAL:
        return "serial";
      case PgIdType.BIGSERIAL:
        return "bigserial";
    }
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
    } catch (e) {
      PgVectorStore.logger.warn(
        `Failed to obtain the embedding dimensions from the embedding model and fall backs to default:${PgVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE}`,
        e,
      );
    }
    return PgVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE;
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    return VectorStoreObservationContext.builder(
      VectorStoreProvider.PG_VECTOR.value,
      operationName,
    )
      .collectionName(this._vectorTableName)
      .dimensions(this._dimensions > 0 ? this._dimensions : null)
      .namespace(this._schemaName)
      .similarityMetric(this.getSimilarityMetric());
  }

  private getSimilarityMetric(): string {
    const metric = SIMILARITY_TYPE_MAPPING.get(this._distanceType);
    return metric != null ? metric.value : this._distanceType.name;
  }

  override getNativeClient<T>(): T | null {
    return this._jdbcTemplate as unknown as T;
  }

  private mapRow(row: Record<string, unknown>): Document {
    const id = String(row.id);
    const content = row.content == null ? null : String(row.content);
    const rawMetadata = row.metadata;
    const distance = Number(row.distance);

    const metadata = this.toMap(rawMetadata);
    metadata[DocumentMetadata.DISTANCE] = distance;

    return Document.builder()
      .id(id)
      .text(content)
      .metadata(metadata)
      .score(1.0 - distance)
      .build();
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

export class PgVectorStoreBuilder extends AbstractVectorStoreBuilder<PgVectorStoreBuilder> {
  private readonly _jdbcTemplate: JsdbcTemplate;
  private _schemaName: string = PgVectorStore.DEFAULT_SCHEMA_NAME;
  private _vectorTableName: string = PgVectorStore.DEFAULT_TABLE_NAME;
  private _idType: PgIdType = PgVectorStore.DEFAULT_ID_TYPE;
  private _vectorTableValidationsEnabled: boolean =
    PgVectorStore.DEFAULT_SCHEMA_VALIDATION;
  private _dimensions: number = PgVectorStore.INVALID_EMBEDDING_DIMENSION;
  private _distanceType: PgDistanceType = PgDistanceType.COSINE_DISTANCE;
  private _removeExistingVectorStoreTable = false;
  private _indexType: PgIndexType = PgIndexType.HNSW;
  private _initializeSchema = false;
  private _maxDocumentBatchSize: number = PgVectorStore.MAX_DOCUMENT_BATCH_SIZE;

  constructor(jdbcTemplate: JsdbcTemplate, embeddingModel: EmbeddingModel) {
    super(embeddingModel);
    assert(jdbcTemplate, "JdbcTemplate must not be null");
    this._jdbcTemplate = jdbcTemplate;
  }

  get configuredJdbcTemplate(): JsdbcTemplate {
    return this._jdbcTemplate;
  }

  get configuredSchemaName(): string {
    return this._schemaName;
  }

  get configuredVectorTableName(): string {
    return this._vectorTableName;
  }

  get configuredIdType(): PgIdType {
    return this._idType;
  }

  get configuredVectorTableValidationsEnabled(): boolean {
    return this._vectorTableValidationsEnabled;
  }

  get configuredDimensions(): number {
    return this._dimensions;
  }

  get configuredDistanceType(): PgDistanceType {
    return this._distanceType;
  }

  get configuredRemoveExistingVectorStoreTable(): boolean {
    return this._removeExistingVectorStoreTable;
  }

  get configuredIndexType(): PgIndexType {
    return this._indexType;
  }

  get configuredInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  get configuredMaxDocumentBatchSize(): number {
    return this._maxDocumentBatchSize;
  }

  schemaName(schemaName: string): this {
    this._schemaName = schemaName;
    return this;
  }

  vectorTableName(vectorTableName: string): this {
    this._vectorTableName = vectorTableName;
    return this;
  }

  idType(idType: PgIdType): this {
    this._idType = idType;
    return this;
  }

  vectorTableValidationsEnabled(vectorTableValidationsEnabled: boolean): this {
    this._vectorTableValidationsEnabled = vectorTableValidationsEnabled;
    return this;
  }

  dimensions(dimensions: number): this {
    this._dimensions = dimensions;
    return this;
  }

  distanceType(distanceType: PgDistanceType): this {
    this._distanceType = distanceType;
    return this;
  }

  removeExistingVectorStoreTable(
    removeExistingVectorStoreTable: boolean,
  ): this {
    this._removeExistingVectorStoreTable = removeExistingVectorStoreTable;
    return this;
  }

  indexType(indexType: PgIndexType): this {
    this._indexType = indexType;
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  maxDocumentBatchSize(maxDocumentBatchSize: number): this {
    this._maxDocumentBatchSize = maxDocumentBatchSize;
    return this;
  }

  override build(): PgVectorStore {
    return new PgVectorStore(this);
  }
}
