import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import {
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import {
  AbstractObservationVectorStore,
  AbstractVectorStoreBuilder,
  type Filter,
  type SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import type { RedisClientType } from "redis";

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

export enum RedisMetadataFieldType {
  TEXT = "TEXT",
  TAG = "TAG",
  NUMERIC = "NUMERIC",
}

export class RedisMetadataField {
  private constructor(
    public readonly name: string,
    public readonly fieldType: RedisMetadataFieldType,
  ) {}

  static text(name: string): RedisMetadataField {
    return new RedisMetadataField(name, RedisMetadataFieldType.TEXT);
  }

  static numeric(name: string): RedisMetadataField {
    return new RedisMetadataField(name, RedisMetadataFieldType.NUMERIC);
  }

  static tag(name: string): RedisMetadataField {
    return new RedisMetadataField(name, RedisMetadataFieldType.TAG);
  }
}

export class RedisVectorStore extends AbstractObservationVectorStore {
  static readonly DEFAULT_INDEX_NAME = "spring-ai-index";
  static readonly DEFAULT_CONTENT_FIELD_NAME = "content";
  static readonly DEFAULT_EMBEDDING_FIELD_NAME = "embedding";
  static readonly DEFAULT_PREFIX = "embedding:";
  static readonly DEFAULT_VECTOR_ALGORITHM = RedisVectorAlgorithm.HNSW;
  static readonly DEFAULT_DISTANCE_METRIC = RedisDistanceMetric.COSINE;
  static readonly DEFAULT_TEXT_SCORER = RedisTextScorer.BM25;

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

  protected override async doAdd(_documents: Document[]): Promise<void> {
    throw new Error("RedisVectorStore#doAdd is not implemented yet");
  }

  protected override async doDelete(_idList: string[]): Promise<void> {
    throw new Error("RedisVectorStore#doDelete is not implemented yet");
  }

  protected override async doDeleteByFilterExpression(
    _filterExpression: Filter.Expression,
  ): Promise<void> {
    throw new Error(
      "RedisVectorStore#doDeleteByFilterExpression is not implemented yet",
    );
  }

  protected override async doSimilaritySearch(
    _request: SearchRequest,
  ): Promise<Document[]> {
    throw new Error(
      "RedisVectorStore#doSimilaritySearch is not implemented yet",
    );
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
