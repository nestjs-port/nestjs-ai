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

import assert from "node:assert/strict";
import type { OnModuleInit } from "@nestjs/common";
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
  type SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import { LoggerFactory } from "@nestjs-port/core";
import type {
  Collection,
  Db,
  MongoClient,
  SearchIndexDescription,
} from "mongodb";

import { MongoDBAtlasFilterExpressionConverter } from "./mongodb-atlas-filter-expression-converter.js";
import {
  parseFilterExpression,
  VectorSearchAggregation,
} from "./vector-search-aggregation.js";

const INDEX_ALREADY_EXISTS_ERROR_CODE = 68;
const INDEX_ALREADY_EXISTS_ERROR_CODE_NAME = "IndexAlreadyExists";

export interface MongoDBAtlasVectorStoreDocument {
  _id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export type MongoDBAtlasVectorStoreTarget =
  | Collection<MongoDBAtlasVectorStoreDocument>
  | Db
  | MongoClient;

/**
 * MongoDB Atlas-based vector store implementation using the Atlas Vector Search.
 *
 * The store uses a MongoDB collection to persist vector embeddings along with their
 * associated document content and metadata. By default, it uses the "vector_store"
 * collection with a vector search index for similarity search operations.
 *
 * Features:
 * - Automatic schema initialization with configurable collection and index creation
 * - Support for cosine similarity search
 * - Metadata filtering using MongoDB Atlas Search syntax
 * - Configurable similarity thresholds for search results
 * - Batch processing support with configurable batching strategies
 * - Observation and metrics support
 *
 * Basic usage example:
 * ```typescript
 * const vectorStore = MongoDBAtlasVectorStore.builder(mongoClient, embeddingModel)
 *   .collectionName("vector_store")
 *   .initializeSchema(true)
 *   .build();
 *
 * // Add documents
 * await vectorStore.add([
 *   Document.builder().text("content1").metadata({ key1: "value1" }).build(),
 *   Document.builder().text("content2").metadata({ key2: "value2" }).build(),
 * ]);
 *
 * // Search with filters
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
 * ```typescript
 * const vectorStore = MongoDBAtlasVectorStore.builder(mongoClient, embeddingModel)
 *   .collectionName("custom_vectors")
 *   .indexName("custom_vector_index")
 *   .pathName("custom_embedding")
 *   .numCandidates(500)
 *   .metadataFieldsToFilter("category", "author")
 *   .initializeSchema(true)
 *   .build();
 * ```
 *
 * Database Requirements:
 * - MongoDB Atlas cluster with Vector Search enabled
 * - Collection with vector search index configured
 * - Collection schema with id (string), content (string), metadata (document), and
 *   embedding (vector) fields
 * - Proper access permissions for index and collection operations
 */
export class MongoDBAtlasVectorStore
  extends AbstractObservationVectorStore
  implements OnModuleInit
{
  private readonly logger = LoggerFactory.getLogger(
    MongoDBAtlasVectorStore.name,
  );

  static readonly ID_FIELD_NAME = "_id";
  static readonly METADATA_FIELD_NAME = "metadata";
  static readonly CONTENT_FIELD_NAME = "content";
  static readonly SCORE_FIELD_NAME = "score";

  static readonly DEFAULT_COLLECTION_NAME = "vector_store";
  static readonly DEFAULT_INDEX_NAME = "vector_index";
  static readonly DEFAULT_PATH_NAME = "embedding";
  static readonly DEFAULT_NUM_CANDIDATES = 200;

  private readonly _collection: Collection<MongoDBAtlasVectorStoreDocument>;
  private readonly _db: Db | null;
  private readonly _mongoClient: MongoClient | null;
  private readonly _initializeSchema: boolean;
  private readonly _collectionName: string;
  private readonly _indexName: string;
  private readonly _pathName: string;
  private readonly _dbName: string | null;
  private readonly _metadataFieldsToFilter: Set<string>;
  private readonly _numCandidates: number;
  private readonly _filterExpressionConverter: MongoDBAtlasFilterExpressionConverter;

  constructor(builder: MongoDBAtlasVectorStoreBuilder) {
    super({
      embeddingModel: builder.getEmbeddingModel(),
      observationRegistry: builder.getObservationRegistry(),
      customObservationConvention: builder.getCustomObservationConvention(),
      batchingStrategy: builder.getBatchingStrategy(),
    });
    assert(builder.target, "MongoDB Atlas target must not be null");

    this._initializeSchema = builder.configuredInitializeSchema;
    this._collectionName = builder.configuredCollectionName;
    this._indexName = builder.configuredIndexName;
    this._pathName = builder.configuredPathName;
    this._dbName = builder.configuredDbName;
    this._metadataFieldsToFilter = new Set(
      builder.configuredMetadataFieldsToFilter,
    );
    this._numCandidates = builder.configuredNumCandidates;
    this._filterExpressionConverter =
      builder.configuredFilterExpressionConverter;

    const { collection, db, mongoClient } = resolveMongoTarget(
      builder.target,
      this._collectionName,
      this._dbName,
    );
    this._collection = collection;
    this._db = db;
    this._mongoClient = mongoClient;
  }

  static builder(
    target: MongoDBAtlasVectorStoreTarget,
    embeddingModel: EmbeddingModel,
  ): MongoDBAtlasVectorStoreBuilder {
    return new MongoDBAtlasVectorStoreBuilder(target, embeddingModel);
  }

  async onModuleInit(): Promise<void> {
    if (!this._initializeSchema) {
      return;
    }

    // Create the collection if it does not exist
    if (this._db != null) {
      const existing = await this._db
        .listCollections({ name: this._collectionName })
        .toArray();
      if (existing.length === 0) {
        await this._db.createCollection(this._collectionName);
      }
    }
    // Create search index
    await this.createSearchIndex();
  }

  private async createSearchIndex(): Promise<void> {
    try {
      await this._collection.createSearchIndex(
        await this.createSearchIndexDefinition(),
      );
    } catch (e) {
      // Ignore any IndexAlreadyExists errors
      if (isIndexAlreadyExistsError(e)) {
        return;
      }
      throw e;
    }
  }

  /**
   * Provides the Definition for the search index
   */
  private async createSearchIndexDefinition(): Promise<SearchIndexDescription> {
    const dimensions = await this._embeddingModel.dimensions();

    const fields: Record<string, unknown>[] = [
      {
        type: "vector",
        path: this._pathName,
        numDimensions: dimensions,
        similarity: "cosine",
      },
    ];

    for (const fieldName of this._metadataFieldsToFilter) {
      fields.push({ type: "filter", path: `metadata.${fieldName}` });
    }

    return {
      name: this._indexName,
      type: "vectorSearch",
      definition: { fields },
    };
  }

  /**
   * Maps a Bson Document to a Spring AI Document
   * @param mongoDocument the mongoDocument to map to a Spring AI Document
   * @return the Spring AI Document
   */
  private mapMongoDocument(mongoDocument: Record<string, unknown>): Document {
    const id = mongoDocument[MongoDBAtlasVectorStore.ID_FIELD_NAME] as string;
    const content = mongoDocument[
      MongoDBAtlasVectorStore.CONTENT_FIELD_NAME
    ] as string;
    const score = mongoDocument[
      MongoDBAtlasVectorStore.SCORE_FIELD_NAME
    ] as number;
    const metadata = mongoDocument[
      MongoDBAtlasVectorStore.METADATA_FIELD_NAME
    ] as Record<string, unknown>;

    metadata[DocumentMetadata.DISTANCE] = 1 - score;

    return Document.builder()
      .id(id)
      .text(content)
      .metadata(metadata)
      .score(score)
      .build();
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    const embeddings = await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    );
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      await this._collection.replaceOne(
        { _id: document.id },
        {
          content: document.text ?? "",
          metadata: document.metadata,
          embedding: embeddings[i],
        },
        { upsert: true },
      );
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    await this._collection.deleteMany({ _id: { $in: idList } });
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    assert(filterExpression != null, "Filter expression must not be null");

    try {
      const nativeFilterExpression =
        this._filterExpressionConverter.convertExpression(filterExpression);
      const query = parseFilterExpression(nativeFilterExpression) as Parameters<
        typeof this._collection.deleteMany
      >[0];
      const deleteResult = await this._collection.deleteMany(query);

      this.logger.debug(
        `Deleted ${deleteResult.deletedCount} documents matching filter expression`,
      );
    } catch (e) {
      throw new Error("Failed to delete documents by filter", { cause: e });
    }
  }

  protected override async doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]> {
    const nativeFilterExpressions =
      request.filterExpression != null
        ? this._filterExpressionConverter.convertExpression(
            request.filterExpression,
          )
        : "";

    const queryEmbedding = await this._embeddingModel.embed(request.query);
    const vectorSearch = new VectorSearchAggregation(
      queryEmbedding,
      this._pathName,
      this._numCandidates,
      this._indexName,
      request.topK,
      nativeFilterExpressions,
    );

    const pipeline = [
      vectorSearch.toDocument(),
      {
        $addFields: {
          [MongoDBAtlasVectorStore.SCORE_FIELD_NAME]: {
            $meta: "vectorSearchScore",
          },
        },
      },
      {
        $match: {
          [MongoDBAtlasVectorStore.SCORE_FIELD_NAME]: {
            $gte: request.similarityThreshold,
          },
        },
      },
    ];

    const results = await this._collection
      .aggregate<Record<string, unknown>>(pipeline)
      .toArray();
    return results.map((d) => this.mapMongoDocument(d));
  }

  override getNativeClient<T>(): T | null {
    return this._mongoClient as T;
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    return VectorStoreObservationContext.builder(
      VectorStoreProvider.MONGODB.value,
      operationName,
    )
      .collectionName(this._collectionName)
      .fieldName(this._pathName)
      .namespace(this._dbName)
      .similarityMetric(VectorStoreSimilarityMetric.COSINE.value);
  }
}

function resolveMongoTarget(
  target: MongoDBAtlasVectorStoreTarget,
  collectionName: string,
  dbName: string | null,
): {
  collection: Collection<MongoDBAtlasVectorStoreDocument>;
  db: Db | null;
  mongoClient: MongoClient | null;
} {
  if (isCollectionTarget(target)) {
    return { collection: target, db: null, mongoClient: null };
  }

  if (isDbTarget(target)) {
    return {
      collection:
        target.collection<MongoDBAtlasVectorStoreDocument>(collectionName),
      db: target,
      mongoClient: null,
    };
  }

  const db = target.db(dbName ?? undefined);
  return {
    collection: db.collection<MongoDBAtlasVectorStoreDocument>(collectionName),
    db,
    mongoClient: target,
  };
}

function isCollectionTarget(
  target: MongoDBAtlasVectorStoreTarget,
): target is Collection<MongoDBAtlasVectorStoreDocument> {
  return (
    typeof (target as Collection<MongoDBAtlasVectorStoreDocument>).find ===
      "function" &&
    typeof (target as Collection<MongoDBAtlasVectorStoreDocument>).insertOne ===
      "function"
  );
}

function isDbTarget(target: MongoDBAtlasVectorStoreTarget): target is Db {
  return (
    typeof (target as Db).collection === "function" &&
    typeof (target as Db).createCollection === "function" &&
    typeof (target as Db).listCollections === "function"
  );
}

function isIndexAlreadyExistsError(error: unknown): boolean {
  if (error == null || typeof error !== "object") {
    return false;
  }
  const { code, codeName } = error as { code?: number; codeName?: string };
  return (
    code === INDEX_ALREADY_EXISTS_ERROR_CODE ||
    codeName === INDEX_ALREADY_EXISTS_ERROR_CODE_NAME
  );
}

export class MongoDBAtlasVectorStoreBuilder extends AbstractVectorStoreBuilder<MongoDBAtlasVectorStoreBuilder> {
  readonly target: MongoDBAtlasVectorStoreTarget;
  private _collectionName = MongoDBAtlasVectorStore.DEFAULT_COLLECTION_NAME;
  private _indexName = MongoDBAtlasVectorStore.DEFAULT_INDEX_NAME;
  private _pathName = MongoDBAtlasVectorStore.DEFAULT_PATH_NAME;
  private _dbName: string | null = null;
  private _initializeSchema = false;
  private _metadataFieldsToFilter: string[] = [];
  private _numCandidates = MongoDBAtlasVectorStore.DEFAULT_NUM_CANDIDATES;
  private _filterExpressionConverter =
    new MongoDBAtlasFilterExpressionConverter();

  constructor(
    target: MongoDBAtlasVectorStoreTarget,
    embeddingModel: EmbeddingModel,
  ) {
    super(embeddingModel);
    this.target = target;
  }

  /**
   * Configures the collection name. This must match the name of the collection for
   * the Vector Search Index in Atlas.
   */
  collectionName(collectionName: string): this {
    assert(collectionName.trim() !== "", "collectionName must not be empty");
    this._collectionName = collectionName;
    return this;
  }

  /**
   * Configures the vector index name. This must match the name of the Vector Search
   * Index Name in Atlas.
   */
  indexName(indexName: string): this {
    assert(indexName.trim() !== "", "indexName must not be empty");
    this._indexName = indexName;
    return this;
  }

  /**
   * Configures the path name. This must match the name of the field indexed for the
   * Vector Search Index in Atlas.
   */
  pathName(pathName: string): this {
    assert(pathName.trim() !== "", "pathName must not be empty");
    this._pathName = pathName;
    return this;
  }

  dbName(dbName: string | null): this {
    this._dbName = dbName;
    return this;
  }

  /**
   * Sets whether to initialize the schema.
   */
  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  /**
   * Sets the metadata fields to filter in vector search.
   */
  metadataFieldsToFilter(...metadataFieldsToFilter: string[]): this {
    this._metadataFieldsToFilter = metadataFieldsToFilter;
    return this;
  }

  /**
   * Sets the number of candidates for vector search.
   */
  numCandidates(numCandidates: number): this {
    assert(numCandidates > 0, "numCandidates must be greater than zero");
    this._numCandidates = numCandidates;
    return this;
  }

  /**
   * Sets the filter expression converter.
   */
  filterExpressionConverter(
    converter: MongoDBAtlasFilterExpressionConverter,
  ): this {
    assert(converter != null, "filterExpressionConverter must not be null");
    this._filterExpressionConverter = converter;
    return this;
  }

  get configuredCollectionName(): string {
    return this._collectionName;
  }

  get configuredIndexName(): string {
    return this._indexName;
  }

  get configuredPathName(): string {
    return this._pathName;
  }

  get configuredDbName(): string | null {
    return this._dbName;
  }

  get configuredInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  get configuredMetadataFieldsToFilter(): string[] {
    return [...this._metadataFieldsToFilter];
  }

  get configuredNumCandidates(): number {
    return this._numCandidates;
  }

  get configuredFilterExpressionConverter(): MongoDBAtlasFilterExpressionConverter {
    return this._filterExpressionConverter;
  }

  build(): MongoDBAtlasVectorStore {
    return new MongoDBAtlasVectorStore(this);
  }
}
