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
  SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import {
  type RediSearchSchema,
  SCHEMA_FIELD_TYPE,
  SCHEMA_VECTOR_FIELD_ALGORITHM,
} from "@redis/search";
import type { RedisClientType, RedisJSON } from "redis";

import { RedisFilterExpressionConverter } from "./redis-filter-expression-converter";
import {
  type RedisMetadataField,
  RedisMetadataFieldType,
} from "./redis-metadata-field";

type SearchDocumentValue = Record<string, unknown>;
type SearchReplyDocument = { id: string; value: SearchDocumentValue };
type SearchReplyLike = { total: number; documents: SearchReplyDocument[] };

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
  private _schemaInitializationPromise: Promise<void> | null = null;

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
    this._hnswM = builder.configuredHnswM;
    this._hnswEfConstruction = builder.configuredHnswEfConstruction;
    this._hnswEfRuntime = builder.configuredHnswEfRuntime;
    this._defaultRangeThreshold = builder.configuredDefaultRangeThreshold;
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
    await this.ensureSchemaInitialized();

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

    let embedding = (await this._embeddingModel.embed(query)) as number[];
    if (this._distanceMetric === RedisDistanceMetric.COSINE) {
      embedding = this.normalize(embedding);
    }

    let effectiveRadius = 0;
    switch (this._distanceMetric) {
      case RedisDistanceMetric.COSINE:
        effectiveRadius = Math.max(2 - 2 * radius, 0);
        break;
      case RedisDistanceMetric.L2:
        effectiveRadius = 1 / radius - 1;
        break;
      case RedisDistanceMetric.IP:
        effectiveRadius = 2 * radius - 1;
        break;
    }

    if (this._distanceMetric === RedisDistanceMetric.IP && radius < 0.1) {
      const requestBuilder = SearchRequest.builder()
        .query(query)
        .topK(1000)
        .similarityThreshold(radius);
      if (resolvedFilter != null && resolvedFilter.trim() !== "") {
        requestBuilder.filterExpression(resolvedFilter);
      }
      return this.similaritySearch(requestBuilder.build());
    }

    let queryString = `@${this._embeddingFieldName}:[VECTOR_RANGE $radius $BLOB]=>{$YIELD_DISTANCE_AS: ${RedisVectorStore.DISTANCE_FIELD_NAME}}`;
    if (resolvedFilter != null && resolvedFilter.trim() !== "") {
      queryString = `(${queryString} ${resolvedFilter})`;
    }

    const rawResult = await this._redisClient.ft.search(
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

    const result = this.asSearchReply(rawResult);
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
    await this.ensureSchemaInitialized();
    this.validateTextField(textField);

    const escapedQuery = this.escapeSpecialCharacters(query);
    const normalizedField = this.normalizeFieldName(textField);
    const queryBuilder: string[] = [`@${normalizedField}:`];

    if (escapedQuery.includes(" ")) {
      if (this._inOrder) {
        queryBuilder.push(`"${escapedQuery}"`);
      } else {
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

    const rawResult = await this._redisClient.ft.search(
      this._indexName,
      queryBuilder.join(""),
      options,
    );
    const result = this.asSearchReply(rawResult);
    return result.documents.map((document) => this.toDocument(document));
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    await this.ensureSchemaInitialized();
    const embeddings = (await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    )) as number[][];

    const responses = await Promise.all(
      documents.map((document, index) => {
        const fields: Record<string, RedisJSON> = {};
        let embedding = embeddings[index] ?? [];
        if (this._distanceMetric === RedisDistanceMetric.COSINE) {
          embedding = this.normalize(embedding);
        }

        fields[this._embeddingFieldName] = embedding as unknown as RedisJSON;
        fields[this._contentFieldName] = (document.text ?? "") as RedisJSON;
        for (const [key, value] of Object.entries(document.metadata)) {
          fields[key] = value as RedisJSON;
        }

        return this._redisClient.json.set(this.key(document.id), "$", fields);
      }),
    );

    const failed = responses.find((response) => response !== "OK");
    if (failed != null) {
      throw new Error(`Could not add document: ${String(failed)}`);
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    await this.ensureSchemaInitialized();
    await Promise.all(
      idList.map((id) => this._redisClient.json.del(this.key(id))),
    );
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    assert(filterExpression != null, "Filter expression must not be null");
    await this.ensureSchemaInitialized();

    const filterString =
      this._filterExpressionConverter.convertExpression(filterExpression);
    const rawResult = await this._redisClient.ft.search(
      this._indexName,
      filterString,
      {
        RETURN: ["id"],
        LIMIT: { from: 0, size: 10_000 },
        DIALECT: 2,
      },
    );
    const result = this.asSearchReply(rawResult);
    const matchingIds = result.documents.map((document) =>
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
    await this.ensureSchemaInitialized();
    assert(
      request.topK > 0,
      "The number of documents to be returned must be greater than zero",
    );
    assert(
      request.similarityThreshold >= 0 && request.similarityThreshold <= 1,
      "The similarity score is bounded between 0 and 1; least to most similar respectively.",
    );

    const effectiveThreshold =
      this._distanceMetric === RedisDistanceMetric.IP
        ? 0
        : request.similarityThreshold;

    const filter = this.nativeExpressionFilter(request);
    const queryString = `${filter}=>[KNN ${request.topK} @${this._embeddingFieldName} $BLOB AS ${RedisVectorStore.DISTANCE_FIELD_NAME}]`;
    let embedding = (await this._embeddingModel.embed(
      request.query,
    )) as number[];
    if (this._distanceMetric === RedisDistanceMetric.COSINE) {
      embedding = this.normalize(embedding);
    }

    const rawResult = await this._redisClient.ft.search(
      this._indexName,
      queryString,
      {
        PARAMS: { BLOB: this.toFloat32Buffer(embedding) },
        RETURN: this.getReturnFields(),
        LIMIT: { from: 0, size: request.topK },
        DIALECT: 2,
      },
    );
    const result = this.asSearchReply(rawResult);

    return result.documents
      .filter(
        (document) =>
          this.similarityScore(document.value) >= effectiveThreshold,
      )
      .map((document) => this.toDocument(document));
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
    await this.ensureSchemaInitialized();
    const rawResult = await this._redisClient.ft.search(
      this._indexName,
      filterExpression,
      {
        RETURN: ["id"],
        LIMIT: { from: 0, size: 0 },
        DIALECT: 2,
      },
    );
    return this.asSearchReply(rawResult).total;
  }

  private toDocument(doc: SearchReplyDocument): Document {
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

    const similarity = this.similarityScore(doc.value);
    const rawScore = doc.value[RedisVectorStore.DISTANCE_FIELD_NAME];
    if (rawScore != null) {
      metadata[RedisVectorStore.DISTANCE_FIELD_NAME] = rawScore;
    }
    metadata[DocumentMetadata.DISTANCE] = 1 - similarity;

    return Document.builder()
      .id(id)
      .text(content)
      .metadata(metadata)
      .score(similarity)
      .build();
  }

  private similarityScore(value: SearchDocumentValue): number {
    const textScore = value.$score;
    if (typeof textScore === "string" || typeof textScore === "number") {
      const parsed = Number(textScore);
      if (Number.isNaN(parsed)) {
        return 0.9;
      }
      return Math.min(parsed / 10, 1);
    }

    const rawValue = value[RedisVectorStore.DISTANCE_FIELD_NAME];
    if (rawValue == null) {
      return 0.9;
    }

    const rawScore = Number(rawValue);
    if (Number.isNaN(rawScore)) {
      return 0;
    }

    switch (this._distanceMetric) {
      case RedisDistanceMetric.COSINE:
        return Math.max((2 - rawScore) / 2, 0);
      case RedisDistanceMetric.L2:
        return 1 / (1 + rawScore);
      case RedisDistanceMetric.IP:
        return Math.min(Math.max((rawScore + 1) / 2, 0), 1);
      default:
        return 0;
    }
  }

  private nativeExpressionFilter(request: SearchRequest): string {
    if (request.filterExpression == null) {
      return "*";
    }
    return `(${this._filterExpressionConverter.convertExpression(request.filterExpression)})`;
  }

  private async ensureSchemaInitialized(): Promise<void> {
    if (!this._initializeSchema || this._schemaInitialized) {
      return;
    }
    if (this._schemaInitializationPromise != null) {
      await this._schemaInitializationPromise;
      return;
    }

    this._schemaInitializationPromise = (async () => {
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
    })();

    try {
      await this._schemaInitializationPromise;
    } finally {
      this._schemaInitializationPromise = null;
    }
  }

  private async createSchema(): Promise<RediSearchSchema> {
    const dimensions = await this._embeddingModel.dimensions();
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
    const normalized = this.normalizeFieldName(fieldName);
    if (normalized === this._contentFieldName) {
      return;
    }

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
    if (normalized.startsWith("@")) {
      normalized = normalized.slice(1);
    }
    if (normalized.startsWith("$.")) {
      normalized = normalized.slice(2);
    }
    return normalized;
  }

  private escapeSpecialCharacters(query: string): string {
    return query
      .replaceAll("-", "\\-")
      .replaceAll("@", "\\@")
      .replaceAll(":", "\\:")
      .replaceAll(".", "\\.")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
  }

  private normalize(vector: number[]): number[] {
    let magnitude = 0;
    for (const value of vector) {
      magnitude += value * value;
    }
    magnitude = Math.sqrt(magnitude);
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((value) => value / magnitude);
  }

  private toFloat32Buffer(vector: number[]): Buffer {
    const floatArray = Float32Array.from(vector);
    return Buffer.from(
      floatArray.buffer,
      floatArray.byteOffset,
      floatArray.byteLength,
    );
  }

  private asSearchReply(value: unknown): SearchReplyLike {
    const searchReply = value as SearchReplyLike;
    return {
      total: searchReply.total ?? 0,
      documents: Array.isArray(searchReply.documents)
        ? searchReply.documents
        : [],
    };
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
