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
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
  type Document,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import {
  AbstractObservationVectorStore,
  AbstractVectorStoreBuilder,
  type Filter,
  type FilterExpressionConverter,
  type SearchRequest,
  VectorStoreObservationContext,
} from "@nestjs-ai/vector-store";

import { ElasticsearchAiSearchFilterExpressionConverter } from "./elasticsearch-ai-search-filter-expression-converter.js";
import {
  ElasticsearchVectorStoreOptions,
  type ElasticsearchVectorStoreOptionsProps,
} from "./elasticsearch-vector-store-options.js";
import { SimilarityFunction } from "./similarity-function.js";

export interface ElasticsearchClientLike {
  readonly [key: string]: unknown;
}

const SIMILARITY_TYPE_MAPPING = new Map<
  SimilarityFunction,
  VectorStoreSimilarityMetric
>([
  [SimilarityFunction.COSINE, VectorStoreSimilarityMetric.COSINE],
  [SimilarityFunction.L2_NORM, VectorStoreSimilarityMetric.EUCLIDEAN],
  [SimilarityFunction.DOT_PRODUCT, VectorStoreSimilarityMetric.DOT],
]);

export class ElasticsearchVectorStore extends AbstractObservationVectorStore {
  private readonly _client: ElasticsearchClientLike;
  private readonly _options: ElasticsearchVectorStoreOptions;
  private readonly _initializeSchema: boolean;
  private readonly _filterExpressionConverter: FilterExpressionConverter;

  constructor(builder: ElasticsearchVectorStoreBuilder) {
    super({
      embeddingModel: builder.getEmbeddingModel(),
      observationRegistry: builder.getObservationRegistry(),
      customObservationConvention: builder.getCustomObservationConvention(),
      batchingStrategy: builder.getBatchingStrategy(),
    });

    assert(builder.getClient(), "Elasticsearch client must not be null");
    this._client = builder.getClient();
    this._options = builder.getOptions();
    this._initializeSchema = builder.getInitializeSchema();
    this._filterExpressionConverter = builder.getFilterExpressionConverter();
  }

  static builder(
    client: ElasticsearchClientLike,
    embeddingModel: EmbeddingModel,
  ): ElasticsearchVectorStoreBuilder {
    return new ElasticsearchVectorStoreBuilder(client, embeddingModel);
  }

  get client(): ElasticsearchClientLike {
    return this._client;
  }

  get options(): ElasticsearchVectorStoreOptions {
    return this._options;
  }

  get initializeSchema(): boolean {
    return this._initializeSchema;
  }

  get filterExpressionConverter(): FilterExpressionConverter {
    return this._filterExpressionConverter;
  }

  protected override async doAdd(_documents: Document[]): Promise<void> {
    throw new Error(
      "ElasticsearchVectorStore.add is not implemented yet. This package is currently scaffold-only.",
    );
  }

  protected override async doDelete(_idList: string[]): Promise<void> {
    throw new Error(
      "ElasticsearchVectorStore.delete is not implemented yet. This package is currently scaffold-only.",
    );
  }

  protected override async doDeleteByFilterExpression(
    _filterExpression: Filter.Expression,
  ): Promise<void> {
    throw new Error(
      "ElasticsearchVectorStore.deleteByFilterExpression is not implemented yet. This package is currently scaffold-only.",
    );
  }

  protected override async doSimilaritySearch(
    _request: SearchRequest,
  ): Promise<Document[]> {
    throw new Error(
      "ElasticsearchVectorStore.similaritySearch is not implemented yet. This package is currently scaffold-only.",
    );
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    return VectorStoreObservationContext.builder(
      VectorStoreProvider.ELASTICSEARCH.value,
      operationName,
    )
      .collectionName(this._options.indexName)
      .dimensions(this._options.dimensions)
      .fieldName(this._options.embeddingFieldName)
      .similarityMetric(this.getSimilarityMetric());
  }

  override getNativeClient<T>(): T | null {
    return this._client as T;
  }

  private getSimilarityMetric(): string {
    const metric = SIMILARITY_TYPE_MAPPING.get(this._options.similarity);
    return metric != null ? metric.value : this._options.similarity;
  }
}

export class ElasticsearchVectorStoreBuilder extends AbstractVectorStoreBuilder<ElasticsearchVectorStoreBuilder> {
  private readonly _client: ElasticsearchClientLike;
  private _options = new ElasticsearchVectorStoreOptions();
  private _initializeSchema = false;
  private _filterExpressionConverter: FilterExpressionConverter =
    new ElasticsearchAiSearchFilterExpressionConverter();

  constructor(client: ElasticsearchClientLike, embeddingModel: EmbeddingModel) {
    super(embeddingModel);
    assert(client, "Elasticsearch client must not be null");
    this._client = client;
  }

  getClient(): ElasticsearchClientLike {
    return this._client;
  }

  getOptions(): ElasticsearchVectorStoreOptions {
    return this._options;
  }

  getInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  getFilterExpressionConverter(): FilterExpressionConverter {
    return this._filterExpressionConverter;
  }

  options(
    options:
      | ElasticsearchVectorStoreOptions
      | ElasticsearchVectorStoreOptionsProps,
  ): this {
    this._options =
      options instanceof ElasticsearchVectorStoreOptions
        ? options
        : new ElasticsearchVectorStoreOptions(options);
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  filterExpressionConverter(
    filterExpressionConverter: FilterExpressionConverter,
  ): this {
    assert(
      filterExpressionConverter,
      "filterExpressionConverter must not be null",
    );
    this._filterExpressionConverter = filterExpressionConverter;
    return this;
  }

  override build(): ElasticsearchVectorStore {
    return new ElasticsearchVectorStore(this);
  }
}
