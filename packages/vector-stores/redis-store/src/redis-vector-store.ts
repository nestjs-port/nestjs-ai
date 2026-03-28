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
  LoggerFactory,
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { EmbeddingOptions } from "@nestjs-ai/model";
import {
  AbstractObservationVectorStore,
  AbstractVectorStoreBuilder,
  type Filter,
  SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import {
  type RediSearchSchema,
  SCHEMA_FIELD_TYPE,
  SCHEMA_VECTOR_FIELD_ALGORITHM,
  type SearchReply,
} from "@redis/search";
import type { RedisClientType, RedisJSON } from "redis";

import { RedisFilterExpressionConverter } from "./redis-filter-expression-converter";
import {
  type RedisMetadataField,
  RedisMetadataFieldType,
} from "./redis-metadata-field";

export enum RedisVectorAlgorithm {
  FLAT = "FLAT",
  HNSW = "HNSW",
}

export enum RedisDistanceMetric {
  COSINE = "COSINE",
  L2 = "L2",
  IP = "IP",
}

export enum RedisTextScorer {
  BM25 = "BM25",
  TFIDF = "TFIDF",
  BM25STD = "BM25STD",
  DISMAX = "DISMAX",
  DOCSCORE = "DOCSCORE",
}

export class RedisVectorStore extends AbstractObservationVectorStore {
  private readonly logger = LoggerFactory.getLogger(RedisVectorStore.name);

  static readonly DEFAULT_INDEX_NAME = "spring-ai-index";
  static readonly DEFAULT_CONTENT_FIELD_NAME = "content";
  static readonly DEFAULT_EMBEDDING_FIELD_NAME = "embedding";
  static readonly DEFAULT_PREFIX = "embedding:";
  static readonly DEFAULT_VECTOR_ALGORITHM = RedisVectorAlgorithm.HNSW;
  static readonly DEFAULT_DISTANCE_METRIC = RedisDistanceMetric.COSINE;
  static readonly DEFAULT_TEXT_SCORER = RedisTextScorer.BM25;
  static readonly DISTANCE_FIELD_NAME = "vector_score";

  private readonly _redisClient: RedisClientType;
  private readonly _initializeSchema: boolean;
  private readonly _indexName: string;
  private readonly _prefix: string;
  private readonly _contentFieldName: string;
  private readonly _embeddingFieldName: string;
  private readonly _vectorAlgorithm: RedisVectorAlgorithm;
  private readonly _distanceMetric: RedisDistanceMetric;
  private readonly _metadataFields: RedisMetadataField[];
  private readonly _hnswM: number;
  private readonly _hnswEfConstruction: number;
  private readonly _hnswEfRuntime: number;
  private readonly _defaultRangeThreshold: number | null;
  private readonly _textScorer: RedisTextScorer;
  private readonly _inOrder: boolean;
  private readonly _stopwords: Set<string>;
  private readonly _filterExpressionConverter: RedisFilterExpressionConverter;

  private _schemaInitialized = false;

  constructor(builder: RedisVectorStoreBuilder) {
    super({
      embeddingModel: builder.embeddingModel,
      observationRegistry: builder.configuredObservationRegistry,
      customObservationConvention: builder.configuredObservationConvention,
      batchingStrategy: builder.configuredBatchingStrategy,
    });
    assert(builder.redisClient, "Redis client must not be null");

    this._redisClient = builder.redisClient;
    this._initializeSchema = builder.configuredInitializeSchema;
    this._indexName = builder.configuredIndexName;
    this._prefix = builder.configuredPrefix;
    this._contentFieldName = builder.configuredContentFieldName;
    this._embeddingFieldName = builder.configuredEmbeddingFieldName;
    this._vectorAlgorithm = builder.configuredVectorAlgorithm;
    this._distanceMetric = builder.configuredDistanceMetric;
    this._metadataFields = [...builder.configuredMetadataFields];
    // HNSW algorithm configuration parameters
    this._hnswM = builder.configuredHnswM;
    this._hnswEfConstruction = builder.configuredHnswEfConstruction;
    this._hnswEfRuntime = builder.configuredHnswEfRuntime;
    // Default range threshold for range searches (0.0 to 1.0)
    this._defaultRangeThreshold = builder.configuredDefaultRangeThreshold;
    // Text search configuration
    this._textScorer = builder.configuredTextScorer;
    this._inOrder = builder.configuredInOrder;
    this._stopwords = new Set(builder.configuredStopwords);
    this._filterExpressionConverter = new RedisFilterExpressionConverter(
      this._metadataFields,
    );
  }

  static builder(
    redisClient: RedisClientType,
    embeddingModel: EmbeddingModel,
  ): RedisVectorStoreBuilder {
    return new RedisVectorStoreBuilder(redisClient, embeddingModel);
  }

  get redisClient(): RedisClientType {
    return this._redisClient;
  }

  get distanceMetric(): RedisDistanceMetric {
    return this._distanceMetric;
  }

  override getNativeClient<T>(): T | null {
    return this._redisClient as T;
  }

  async onModuleInit(): Promise<void> {
    if (!this._initializeSchema || this._schemaInitialized) {
      return;
    }

    const existingIndexes = new Set(await this._redisClient.ft._list());
    if (existingIndexes.has(this._indexName)) {
      this._schemaInitialized = true;
      return;
    }

    const schema = await this.createSchema();
    const response = await this._redisClient.ft.create(
      this._indexName,
      schema,
      {
        ON: "JSON",
        PREFIX: this._prefix,
      },
    );
    if (response !== "OK") {
      throw new Error(`Could not create index: ${String(response)}`);
    }
    this._schemaInitialized = true;
  }

  async count(): Promise<number>;
  async count(filterExpression: string): Promise<number>;
  async count(filterExpression: Filter.Expression): Promise<number>;
  async count(filterExpression?: string | Filter.Expression): Promise<number> {
    if (filterExpression == null) {
      return this.executeCountQuery("*");
    }

    if (typeof filterExpression === "string") {
      assert(
        filterExpression.trim() !== "",
        "Filter expression must not be empty",
      );
      return this.executeCountQuery(filterExpression);
    }

    return this.executeCountQuery(
      this._filterExpressionConverter.convertExpression(filterExpression),
    );
  }

  async searchByRange(query: string): Promise<Document[]>;
  async searchByRange(query: string, radius: number): Promise<Document[]>;
  async searchByRange(
    query: string,
    filterExpression: string | null,
  ): Promise<Document[]>;
  async searchByRange(
    query: string,
    radius: number,
    filterExpression: string | null,
  ): Promise<Document[]>;
  async searchByRange(
    query: string,
    radiusOrFilter?: number | string | null,
    filterExpression?: string | null,
  ): Promise<Document[]> {
    assert(query != null, "Query must not be null");
    let radius: number;
    let resolvedFilter: string | null = null;
    if (typeof radiusOrFilter === "number") {
      radius = radiusOrFilter;
      resolvedFilter = filterExpression ?? null;
    } else if (typeof radiusOrFilter === "string") {
      assert(
        this._defaultRangeThreshold != null,
        "No default range threshold configured. Use searchByRange(query, radius, filterExpression) instead.",
      );
      radius = this._defaultRangeThreshold;
      resolvedFilter = radiusOrFilter;
    } else {
      assert(
        this._defaultRangeThreshold != null,
        "No default range threshold configured. Use searchByRange(query, radius) instead.",
      );
      radius = this._defaultRangeThreshold;
      resolvedFilter = null;
    }

    assert(
      radius >= 0 && radius <= 1,
      "Radius must be between 0.0 and 1.0 (inclusive) representing the similarity threshold",
    );

    // Convert the normalized radius (0.0-1.0) to the appropriate distance metric value.
    let embedding = await this._embeddingModel.embed(query);
    if (this._distanceMetric === RedisDistanceMetric.COSINE) {
      // Normalize embeddings for COSINE distance metric
      embedding = this.normalize(embedding);
    }

    let effectiveRadius = 0;
    switch (this._distanceMetric) {
      case RedisDistanceMetric.COSINE:
        // Convert similarity score (0.0-1.0) to distance value (0.0-2.0)
        effectiveRadius = Math.max(2 - 2 * radius, 0);
        break;
      case RedisDistanceMetric.L2:
        // For L2, convert similarity back to distance
        effectiveRadius = 1 / radius - 1;
        break;
      case RedisDistanceMetric.IP:
        // For IP, convert similarity back to the raw score range
        effectiveRadius = 2 * radius - 1;
        break;
    }

    if (this._distanceMetric === RedisDistanceMetric.IP && radius < 0.1) {
      // For very small similarity thresholds, do filtering in memory to be extra safe
      const requestBuilder = SearchRequest.builder()
        .query(query)
        .topK(1000)
        .similarityThreshold(radius);
      if (resolvedFilter != null && resolvedFilter.trim() !== "") {
        requestBuilder.filterExpression(resolvedFilter);
      }
      return this.similaritySearch(requestBuilder.build());
    }

    // Build the base query with vector range
    let queryString = `@${this._embeddingFieldName}:[VECTOR_RANGE $radius $BLOB]=>{$YIELD_DISTANCE_AS: ${RedisVectorStore.DISTANCE_FIELD_NAME}}`;
    if (resolvedFilter != null && resolvedFilter.trim() !== "") {
      // Add filter if provided
      queryString = `(${queryString} ${resolvedFilter})`;
    }

    const result = await this._redisClient.ft.search(
      this._indexName,
      queryString,
      {
        PARAMS: {
          radius: effectiveRadius,
          BLOB: this.toFloat32Buffer(embedding),
        },
        RETURN: this.getReturnFields(),
        DIALECT: 2,
      },
    );
    // Process the results and ensure they match the specified similarity threshold
    return result.documents
      .map((document) => this.toDocument(document))
      .filter((document) => (document.score ?? 0) >= radius);
  }

  async searchByText(
    query: string,
    textField: string,
    limit = 10,
    filterExpression: string | null = null,
  ): Promise<Document[]> {
    assert(query != null, "Query must not be null");
    assert(textField != null, "Text field must not be null");
    assert(limit > 0, "Limit must be greater than zero");
    // Verify the field is a text field
    this.validateTextField(textField);

    // Process and escape any special characters in the query
    const escapedQuery = this.escapeSpecialCharacters(query);
    // Normalize field name (remove @ prefix and JSON path if present)
    const normalizedField = this.normalizeFieldName(textField);
    const queryBuilder: string[] = [`@${normalizedField}:`];

    // Handle multi-word queries differently from single words
    if (escapedQuery.includes(" ")) {
      if (this._inOrder) {
        queryBuilder.push(`"${escapedQuery}"`);
      } else {
        // For non-inOrder, search for any of the terms
        const terms = escapedQuery.split(/\s+/);
        const termParts = [`"${escapedQuery}"`];
        for (const term of terms) {
          if (this._stopwords.has(term.toLowerCase())) {
            continue;
          }
          termParts.push(term);
        }
        queryBuilder.push(`(${termParts.join(" | ")})`);
      }
    } else {
      queryBuilder.push(escapedQuery);
    }

    // Add filter if provided
    if (filterExpression != null && filterExpression.trim() !== "") {
      queryBuilder.push(` ${filterExpression}`);
    }

    const options: {
      RETURN: string[];
      LIMIT: { from: number; size: number };
      DIALECT: number;
      SCORER?: string;
    } = {
      RETURN: this.getReturnFields(),
      LIMIT: { from: 0, size: limit },
      DIALECT: 2,
    };
    if (this._textScorer !== RedisVectorStore.DEFAULT_TEXT_SCORER) {
      options.SCORER = this._textScorer;
    }

    // Create and execute the query
    const result = await this._redisClient.ft.search(
      this._indexName,
      queryBuilder.join(""),
      options,
    );
    return result.documents.map((document) => this.toDocument(document));
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    const embeddings = await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    );

    const responses = await Promise.all(
      documents.map((document, index) => {
        const fields: Record<string, RedisJSON> = {};
        let embedding = embeddings[index] ?? [];

        // Normalize embeddings for COSINE distance metric
        if (this._distanceMetric === RedisDistanceMetric.COSINE) {
          embedding = this.normalize(embedding);
        }

        fields[this._embeddingFieldName] = embedding;
        fields[this._contentFieldName] = document.text ?? "";
        for (const [key, value] of Object.entries(document.metadata)) {
          fields[key] = value as RedisJSON;
        }

        return this._redisClient.json.set(this.key(document.id), "$", fields);
      }),
    );

    const failed = responses.find((response) => response !== "OK");
    if (failed != null) {
      if (this.logger.isErrorEnabled()) {
        this.logger.error(`Could not add document: ${String(failed)}`);
      }
      throw new Error(`Could not add document: ${String(failed)}`);
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    const responses = await Promise.all(
      idList.map((id) => this._redisClient.json.del(this.key(id))),
    );
    const failed = responses.find((deletedCount) => deletedCount !== 1);
    if (failed != null) {
      if (this.logger.isErrorEnabled()) {
        this.logger.error(`Could not delete document: ${String(failed)}`);
      }
      throw new Error(`Could not delete document: ${String(failed)}`);
    }
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    assert(filterExpression != null, "Filter expression must not be null");

    const filterString =
      this._filterExpressionConverter.convertExpression(filterExpression);
    const result = await this._redisClient.ft.search(
      this._indexName,
      filterString,
      {
        RETURN: ["id"],
        LIMIT: { from: 0, size: 10_000 },
        DIALECT: 2,
      },
    );
    const matchingIds = result.documents.map((document) =>
      // Remove the key prefix to get original ID
      document.id.startsWith(this._prefix)
        ? document.id.slice(this._prefix.length)
        : document.id,
    );

    if (matchingIds.length === 0) {
      return;
    }

    const responses = await Promise.all(
      matchingIds.map((id) => this._redisClient.json.del(this.key(id))),
    );
    const failed = responses.find((deletedCount) => deletedCount !== 1);
    if (failed != null) {
      throw new Error("Failed to delete some documents");
    }
  }

  protected override async doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]> {
    assert(
      request.topK > 0,
      "The number of documents to be returned must be greater than zero",
    );
    assert(
      request.similarityThreshold >= 0 && request.similarityThreshold <= 1,
      "The similarity score is bounded between 0 and 1; least to most similar respectively.",
    );

    // For IP metric, temporarily disable threshold filtering
    const effectiveThreshold =
      this._distanceMetric === RedisDistanceMetric.IP
        ? 0
        : request.similarityThreshold;

    const filter = this.nativeExpressionFilter(request);

    const queryString = `${filter}=>[KNN ${request.topK} @${this._embeddingFieldName} $BLOB AS ${RedisVectorStore.DISTANCE_FIELD_NAME}]`;

    let embedding = await this._embeddingModel.embed(request.query);

    if (this._distanceMetric === RedisDistanceMetric.COSINE) {
      // Normalize embeddings for COSINE distance metric
      embedding = this.normalize(embedding);
    }

    const result = await this._redisClient.ft.search(
      this._indexName,
      queryString,
      {
        PARAMS: { BLOB: this.toFloat32Buffer(embedding) },
        RETURN: this.getReturnFields(),
        LIMIT: { from: 0, size: request.topK },
        DIALECT: 2,
      },
    );

    // Add more detailed logging to understand thresholding
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `Applying filtering with effectiveThreshold: ${effectiveThreshold}`,
      );
      this.logger.debug(`Redis search returned ${result.total} documents`);
    }

    // Apply filtering based on effective threshold (may be different for IP metric)
    const documents = result.documents
      .filter((document) => {
        const score = this.similarityScore(document);
        const isAboveThreshold = score >= effectiveThreshold;
        if (this.logger.isDebugEnabled()) {
          const rawScore =
            document.value[RedisVectorStore.DISTANCE_FIELD_NAME] ?? "N/A";
          this.logger.debug(
            `Document raw_score: ${String(rawScore)}, normalized_score: ${score}, above_threshold: ${isAboveThreshold}`,
          );
        }
        return isAboveThreshold;
      })
      .map((document) => this.toDocument(document));

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `After filtering, returning ${documents.length} documents`,
      );
    }

    return documents;
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    return VectorStoreObservationContext.builder(
      VectorStoreProvider.REDIS.value,
      operationName,
    )
      .dimensions(null)
      .collectionName(this._indexName)
      .fieldName(this._embeddingFieldName)
      .similarityMetric(this.getObservationSimilarityMetricValue());
  }

  private getObservationSimilarityMetricValue(): string {
    if (this._distanceMetric === RedisDistanceMetric.COSINE) {
      return VectorStoreSimilarityMetric.COSINE.value;
    }
    if (this._distanceMetric === RedisDistanceMetric.L2) {
      return VectorStoreSimilarityMetric.EUCLIDEAN.value;
    }
    return VectorStoreSimilarityMetric.DOT.value;
  }

  private key(id: string): string {
    return `${this._prefix}${id}`;
  }

  private async executeCountQuery(filterExpression: string): Promise<number> {
    const rawResult = await this._redisClient.ft.search(
      this._indexName,
      filterExpression,
      {
        RETURN: ["id"],
        LIMIT: { from: 0, size: 0 },
        DIALECT: 2,
      },
    );
    return rawResult.total;
  }

  private toDocument(doc: SearchReply["documents"][number]): Document {
    const id = doc.id.startsWith(this._prefix)
      ? doc.id.slice(this._prefix.length)
      : doc.id;
    const contentValue = doc.value[this._contentFieldName];
    const content = typeof contentValue === "string" ? contentValue : "";

    const metadata: Record<string, unknown> = {};
    for (const field of this._metadataFields) {
      const value = doc.value[field.name];
      if (value != null) {
        metadata[field.name] = value;
      }
    }

    // Get similarity score first
    const similarity = this.similarityScore(doc);
    const rawScore = doc.value[RedisVectorStore.DISTANCE_FIELD_NAME];
    if (rawScore != null) {
      // We store the raw score from Redis so it can be used for debugging if available
      metadata[RedisVectorStore.DISTANCE_FIELD_NAME] = rawScore;
    }
    // The distance in the standard metadata should be inverted from similarity (1.0 - similarity)
    metadata[DocumentMetadata.DISTANCE] = 1 - similarity;

    return Document.builder()
      .id(id)
      .text(content)
      .metadata(metadata)
      .score(similarity)
      .build();
  }

  private similarityScore(doc: SearchReply["documents"][number]): number {
    const value = doc.value;
    // For text search, check if we have a text score from Redis
    if ("$score" in value) {
      const textScore = Number.parseFloat(String(value.$score));
      if (Number.isNaN(textScore)) {
        // If we can't parse the score, fall back to default
        if (this.logger.isDebugEnabled()) {
          this.logger.warn(
            `Could not parse text search score: ${String(value.$score)}`,
          );
        }
        return 0.9;
      }

      // A simple normalization strategy - text scores are usually positive,
      // scale to 0.0-1.0
      const normalizedTextScore = Math.min(textScore / 10, 1);
      // Assuming 10.0 is a "perfect" score, but capping at 1.0
      if (this.logger.isDebugEnabled()) {
        this.logger.debug(
          `Text search raw score: ${textScore}, normalized: ${normalizedTextScore}`,
        );
      }
      return normalizedTextScore;
    }

    // Handle the case where the distance field might not be present (like in text search)
    const rawValue = value[RedisVectorStore.DISTANCE_FIELD_NAME];
    if (rawValue == null) {
      // For text search, we don't have a vector distance, so use a default high similarity
      if (this.logger.isDebugEnabled()) {
        this.logger.debug(
          "No vector distance score found. Using default similarity.",
        );
      }
      return 0.9;
    }

    const rawScore = Number.parseFloat(String(rawValue));
    if (Number.isNaN(rawScore)) {
      return 0;
    }

    // Different distance metrics need different score transformations
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `Distance metric: ${this._distanceMetric}, Raw score: ${rawScore}`,
      );
    }

    // If using IP (inner product), higher is better (it's a dot product)
    // For COSINE and L2, lower is better (they're distances)
    switch (this._distanceMetric) {
      case RedisDistanceMetric.COSINE:
        // Following RedisVL's implementation in utils.py:
        // norm_cosine_distance(value)
        // Distance in Redis is between 0 and 2 for cosine (lower is better)
        // A normalized similarity score would be (2-distance)/2 which gives 0 to
        // 1 (higher is better)
        return Math.max((2 - rawScore) / 2, 0);
      case RedisDistanceMetric.L2:
        // Following RedisVL's implementation in utils.py: norm_l2_distance(value)
        // For L2, convert to similarity score 0-1 where higher is better
        return 1 / (1 + rawScore);
      case RedisDistanceMetric.IP: {
        // For IP (Inner Product), the scores are naturally similarity-like,
        // but need proper normalization to 0-1 range
        // Map inner product scores to 0-1 range, usually IP scores are between -1
        // and 1
        // for unit vectors, so (score+1)/2 maps to 0-1 range
        const normalizedScore = (rawScore + 1) / 2;
        // Clamp to 0-1 range to ensure we don't exceed bounds
        // Log the normalized IP score for debugging
        if (this.logger.isDebugEnabled()) {
          this.logger.debug(
            `IP raw score: ${rawScore}, normalized score: ${normalizedScore}`,
          );
        }
        return Math.min(Math.max(normalizedScore, 0.0), 1.0);
      }
      default:
        // Should never happen, but just in case
        return 0;
    }
  }

  private nativeExpressionFilter(request: SearchRequest): string {
    if (request.filterExpression == null) {
      return "*";
    }
    return `(${this._filterExpressionConverter.convertExpression(request.filterExpression)})`;
  }

  private async createSchema(): Promise<RediSearchSchema> {
    const dimensions = await this._embeddingModel.dimensions();
    // Default HNSW algorithm parameters
    const vectorField: RediSearchSchema[string] =
      this._vectorAlgorithm === RedisVectorAlgorithm.HNSW
        ? {
            type: SCHEMA_FIELD_TYPE.VECTOR,
            AS: this._embeddingFieldName,
            ALGORITHM: SCHEMA_VECTOR_FIELD_ALGORITHM.HNSW,
            TYPE: "FLOAT32",
            DIM: dimensions,
            DISTANCE_METRIC: this._distanceMetric,
            M: this._hnswM,
            EF_CONSTRUCTION: this._hnswEfConstruction,
            EF_RUNTIME: this._hnswEfRuntime,
          }
        : {
            type: SCHEMA_FIELD_TYPE.VECTOR,
            AS: this._embeddingFieldName,
            ALGORITHM: SCHEMA_VECTOR_FIELD_ALGORITHM.FLAT,
            TYPE: "FLOAT32",
            DIM: dimensions,
            DISTANCE_METRIC: this._distanceMetric,
          };

    const schema: RediSearchSchema = {
      [`$.${this._contentFieldName}`]: {
        type: SCHEMA_FIELD_TYPE.TEXT,
        AS: this._contentFieldName,
        WEIGHT: 1.0,
      },
      [`$.${this._embeddingFieldName}`]: vectorField,
    };

    for (const field of this._metadataFields) {
      const jsonPath = `$.${field.name}`;
      switch (field.fieldType) {
        case RedisMetadataFieldType.NUMERIC:
          schema[jsonPath] = {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            AS: field.name,
          };
          break;
        case RedisMetadataFieldType.TAG:
          schema[jsonPath] = { type: SCHEMA_FIELD_TYPE.TAG, AS: field.name };
          break;
        case RedisMetadataFieldType.TEXT:
          schema[jsonPath] = { type: SCHEMA_FIELD_TYPE.TEXT, AS: field.name };
          break;
        default:
          throw new Error(
            `Field ${field.name} has unsupported type ${String(field.fieldType)}`,
          );
      }
    }
    return schema;
  }

  private getReturnFields(): string[] {
    return [
      ...this._metadataFields.map((field) => field.name),
      this._embeddingFieldName,
      this._contentFieldName,
      RedisVectorStore.DISTANCE_FIELD_NAME,
    ];
  }

  private validateTextField(fieldName: string): void {
    // Normalize the field name for consistent checking
    const normalized = this.normalizeFieldName(fieldName);
    // Check if it's the content field (always a text field)
    if (normalized === this._contentFieldName) {
      return;
    }

    // Check if it's a metadata field with TEXT type
    const isTextField = this._metadataFields.some(
      (field) =>
        field.name === normalized &&
        field.fieldType === RedisMetadataFieldType.TEXT,
    );
    if (!isTextField) {
      throw new Error(`Field '${normalized}' is not a TEXT field`);
    }
  }

  private normalizeFieldName(fieldName: string): string {
    let normalized = fieldName;
    // Remove @ prefix
    if (normalized.startsWith("@")) {
      normalized = normalized.slice(1);
    }
    // Remove JSON path prefix
    if (normalized.startsWith("$.")) {
      normalized = normalized.slice(2);
    }
    return normalized;
  }

  private escapeSpecialCharacters(query: string): string {
    // Escape special characters in a query string for Redis search
    return query
      .replaceAll("-", "\\-")
      .replaceAll("@", "\\@")
      .replaceAll(":", "\\:")
      .replaceAll(".", "\\.")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
  }

  private normalize(vector: number[]): number[] {
    // Calculate the magnitude of the vector
    let magnitude = 0;
    for (const value of vector) {
      magnitude += value * value;
    }
    magnitude = Math.sqrt(magnitude);

    // Avoid division by zero
    if (magnitude === 0) {
      return vector;
    }

    // Normalize the vector
    return vector.map((value) => value / magnitude);
  }

  private toFloat32Buffer(vector: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }
}

export class RedisVectorStoreBuilder extends AbstractVectorStoreBuilder<RedisVectorStoreBuilder> {
  private readonly _redisClient: RedisClientType;
  private _indexName = RedisVectorStore.DEFAULT_INDEX_NAME;
  private _prefix = RedisVectorStore.DEFAULT_PREFIX;
  private _contentFieldName = RedisVectorStore.DEFAULT_CONTENT_FIELD_NAME;
  private _embeddingFieldName = RedisVectorStore.DEFAULT_EMBEDDING_FIELD_NAME;
  private _vectorAlgorithm = RedisVectorStore.DEFAULT_VECTOR_ALGORITHM;
  private _distanceMetric = RedisVectorStore.DEFAULT_DISTANCE_METRIC;
  private _metadataFields: RedisMetadataField[] = [];
  private _initializeSchema = false;
  private _hnswM = 16;
  private _hnswEfConstruction = 200;
  private _hnswEfRuntime = 10;
  private _defaultRangeThreshold: number | null = null;
  private _textScorer = RedisVectorStore.DEFAULT_TEXT_SCORER;
  private _inOrder = false;
  private _stopwords = new Set<string>();

  constructor(redisClient: RedisClientType, embeddingModel: EmbeddingModel) {
    super(embeddingModel);
    assert(redisClient, "Redis client must not be null");
    this._redisClient = redisClient;
  }

  get redisClient(): RedisClientType {
    return this._redisClient;
  }

  get configuredIndexName(): string {
    return this._indexName;
  }

  get configuredPrefix(): string {
    return this._prefix;
  }

  get configuredContentFieldName(): string {
    return this._contentFieldName;
  }

  get configuredEmbeddingFieldName(): string {
    return this._embeddingFieldName;
  }

  get configuredVectorAlgorithm(): RedisVectorAlgorithm {
    return this._vectorAlgorithm;
  }

  get configuredDistanceMetric(): RedisDistanceMetric {
    return this._distanceMetric;
  }

  get configuredMetadataFields(): RedisMetadataField[] {
    return this._metadataFields;
  }

  get configuredInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  get configuredHnswM(): number {
    return this._hnswM;
  }

  get configuredHnswEfConstruction(): number {
    return this._hnswEfConstruction;
  }

  get configuredHnswEfRuntime(): number {
    return this._hnswEfRuntime;
  }

  get configuredDefaultRangeThreshold(): number | null {
    return this._defaultRangeThreshold;
  }

  get configuredTextScorer(): RedisTextScorer {
    return this._textScorer;
  }

  get configuredInOrder(): boolean {
    return this._inOrder;
  }

  get configuredStopwords(): Set<string> {
    return this._stopwords;
  }

  indexName(indexName: string): this {
    if (indexName.trim() !== "") {
      this._indexName = indexName;
    }
    return this;
  }

  prefix(prefix: string): this {
    if (prefix.trim() !== "") {
      this._prefix = prefix;
    }
    return this;
  }

  contentFieldName(fieldName: string): this {
    if (fieldName.trim() !== "") {
      this._contentFieldName = fieldName;
    }
    return this;
  }

  embeddingFieldName(fieldName: string): this {
    if (fieldName.trim() !== "") {
      this._embeddingFieldName = fieldName;
    }
    return this;
  }

  vectorAlgorithm(algorithm: RedisVectorAlgorithm | null): this {
    if (algorithm != null) {
      this._vectorAlgorithm = algorithm;
    }
    return this;
  }

  distanceMetric(distanceMetric: RedisDistanceMetric | null): this {
    if (distanceMetric != null) {
      this._distanceMetric = distanceMetric;
    }
    return this;
  }

  metadataFields(...fields: RedisMetadataField[]): this {
    if (fields.length > 0) {
      this._metadataFields = [...fields];
    }
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  hnswM(m: number): this {
    if (m > 0) {
      this._hnswM = m;
    }
    return this;
  }

  hnswEfConstruction(efConstruction: number): this {
    if (efConstruction > 0) {
      this._hnswEfConstruction = efConstruction;
    }
    return this;
  }

  hnswEfRuntime(efRuntime: number): this {
    if (efRuntime > 0) {
      this._hnswEfRuntime = efRuntime;
    }
    return this;
  }

  defaultRangeThreshold(defaultRangeThreshold: number | null): this {
    if (defaultRangeThreshold != null) {
      assert(
        defaultRangeThreshold >= 0 && defaultRangeThreshold <= 1,
        "Range threshold must be between 0.0 and 1.0",
      );
      this._defaultRangeThreshold = defaultRangeThreshold;
    }
    return this;
  }

  textScorer(textScorer: RedisTextScorer | null): this {
    if (textScorer != null) {
      this._textScorer = textScorer;
    }
    return this;
  }

  inOrder(inOrder: boolean): this {
    this._inOrder = inOrder;
    return this;
  }

  stopwords(stopwords: Set<string> | null): this {
    if (stopwords != null) {
      this._stopwords = new Set(stopwords);
    }
    return this;
  }

  override build(): RedisVectorStore {
    return new RedisVectorStore(this);
  }
}
