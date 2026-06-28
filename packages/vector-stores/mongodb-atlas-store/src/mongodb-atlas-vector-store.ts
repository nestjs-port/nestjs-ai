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
import {
  type Document,
  type DocumentMetadata,
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import {
  AbstractObservationVectorStore,
  AbstractVectorStoreBuilder,
  type SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";
import type { Collection, Db, MongoClient } from "mongodb";

export interface MongoDBAtlasVectorStoreDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
}

export type MongoDBAtlasVectorStoreTarget =
  | Collection<MongoDBAtlasVectorStoreDocument>
  | Db
  | MongoClient;

export class MongoDBAtlasVectorStore extends AbstractObservationVectorStore {
  static readonly DEFAULT_COLLECTION_NAME = "vector_store";
  static readonly DEFAULT_INDEX_NAME = "vector_index";
  static readonly DEFAULT_PATH_NAME = "embedding";
  static readonly DEFAULT_NUM_CANDIDATES = 200;

  private readonly _collection: Collection<MongoDBAtlasVectorStoreDocument>;
  private readonly _mongoClient: MongoClient | null;
  private readonly _initializeSchema: boolean;
  private readonly _collectionName: string;
  private readonly _indexName: string;
  private readonly _pathName: string;
  private readonly _dbName: string | null;
  private readonly _metadataFieldsToFilter: Set<string>;
  private readonly _numCandidates: number;

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

    const { collection, mongoClient } = resolveMongoTarget(
      builder.target,
      this._collectionName,
      this._dbName,
    );
    this._collection = collection;
    this._mongoClient = mongoClient;
  }

  static builder(
    target: MongoDBAtlasVectorStoreTarget,
    embeddingModel: EmbeddingModel,
  ): MongoDBAtlasVectorStoreBuilder {
    return new MongoDBAtlasVectorStoreBuilder(target, embeddingModel);
  }

  override getNativeClient<T>(): T | null {
    return this._mongoClient as T;
  }

  protected override async doAdd(_documents: Document[]): Promise<void> {
    throw new Error("MongoDB Atlas vector store scaffold is not implemented");
  }

  protected override async doDelete(_idList: string[]): Promise<void> {
    throw new Error("MongoDB Atlas vector store scaffold is not implemented");
  }

  protected override async doSimilaritySearch(
    _request: SearchRequest,
  ): Promise<Document[]> {
    throw new Error("MongoDB Atlas vector store scaffold is not implemented");
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
  mongoClient: MongoClient | null;
} {
  if (isCollectionTarget(target)) {
    return { collection: target, mongoClient: null };
  }

  if (isDbTarget(target)) {
    return {
      collection:
        target.collection<MongoDBAtlasVectorStoreDocument>(collectionName),
      mongoClient: null,
    };
  }

  return {
    collection: target
      .db(dbName ?? undefined)
      .collection<MongoDBAtlasVectorStoreDocument>(collectionName),
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

export class MongoDBAtlasVectorStoreBuilder extends AbstractVectorStoreBuilder<MongoDBAtlasVectorStoreBuilder> {
  readonly target: MongoDBAtlasVectorStoreTarget;
  private _collectionName = MongoDBAtlasVectorStore.DEFAULT_COLLECTION_NAME;
  private _indexName = MongoDBAtlasVectorStore.DEFAULT_INDEX_NAME;
  private _pathName = MongoDBAtlasVectorStore.DEFAULT_PATH_NAME;
  private _dbName: string | null = null;
  private _initializeSchema = false;
  private _metadataFieldsToFilter: string[] = [];
  private _numCandidates = MongoDBAtlasVectorStore.DEFAULT_NUM_CANDIDATES;

  constructor(
    target: MongoDBAtlasVectorStoreTarget,
    embeddingModel: EmbeddingModel,
  ) {
    super(embeddingModel);
    this.target = target;
  }

  collectionName(collectionName: string): this {
    assert(collectionName.trim() !== "", "collectionName must not be empty");
    this._collectionName = collectionName;
    return this;
  }

  indexName(indexName: string): this {
    assert(indexName.trim() !== "", "indexName must not be empty");
    this._indexName = indexName;
    return this;
  }

  pathName(pathName: string): this {
    assert(pathName.trim() !== "", "pathName must not be empty");
    this._pathName = pathName;
    return this;
  }

  dbName(dbName: string | null): this {
    this._dbName = dbName;
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  metadataFieldsToFilter(...metadataFieldsToFilter: string[]): this {
    this._metadataFieldsToFilter = metadataFieldsToFilter;
    return this;
  }

  numCandidates(numCandidates: number): this {
    assert(numCandidates > 0, "numCandidates must be greater than zero");
    this._numCandidates = numCandidates;
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

  build(): MongoDBAtlasVectorStore {
    return new MongoDBAtlasVectorStore(this);
  }
}
