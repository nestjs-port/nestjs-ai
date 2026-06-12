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
import type { Client, estypes } from "@elastic/elasticsearch";
import {
  Document,
  DocumentMetadata,
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import { EmbeddingOptions, type EmbeddingModel } from "@nestjs-ai/model";
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

interface ElasticsearchVectorDocumentSource {
  id?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Elasticsearch-based vector store implementation using the dense_vector field type.
 *
 * The store uses an Elasticsearch index to persist vector embeddings along with their
 * associated document content and metadata. The implementation leverages
 * Elasticsearch's k-NN search capabilities for efficient similarity search
 * operations.
 *
 * Features:
 * - Automatic schema initialization with configurable index creation
 * - Support for multiple similarity functions: Cosine, L2 Norm, and Dot Product
 * - Metadata filtering using Elasticsearch query strings
 * - Configurable similarity thresholds for search results
 * - Batch processing support with configurable strategies
 * - Observation and metrics support through Micrometer
 *
 * Basic usage example:
 *
 * ```ts
 * const vectorStore = ElasticsearchVectorStore.builder(client, embeddingModel)
 *   .initializeSchema(true)
 *   .build();
 *
 * // Add documents
 * await vectorStore.add([
 *   new Document("content1", { key1: "value1" }),
 *   new Document("content2", { key2: "value2" }),
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
 *
 * ```ts
 * const options = new ElasticsearchVectorStoreOptions({
 *   indexName: "custom_vectors",
 *   similarity: SimilarityFunction.DOT_PRODUCT,
 *   dimensions: 1536,
 * });
 *
 * const vectorStore = ElasticsearchVectorStore.builder(client, embeddingModel)
 *   .options(options)
 *   .initializeSchema(true)
 *   .batchingStrategy(new TokenCountBatchingStrategy())
 *   .build();
 * ```
 *
 * Requirements:
 * - Elasticsearch 8.0 or later
 * - Index mapping with id (string), content (text), metadata (object), and
 *   embedding (dense_vector) fields
 *
 * Similarity Functions:
 * - cosine: Default, suitable for most use cases. Measures cosine similarity
 *   between vectors.
 * - l2_norm: Euclidean distance between vectors. Lower values indicate higher
 *   similarity.
 * - dot_product: Best performance for normalized vectors (e.g., OpenAI
 *   embeddings).
 */
export class ElasticsearchVectorStore
  extends AbstractObservationVectorStore
  implements OnModuleInit
{
  private static readonly SIMILARITY_TYPE_MAPPING = new Map<
    SimilarityFunction,
    VectorStoreSimilarityMetric
  >([
    [SimilarityFunction.COSINE, VectorStoreSimilarityMetric.COSINE],
    [SimilarityFunction.L2_NORM, VectorStoreSimilarityMetric.EUCLIDEAN],
    [SimilarityFunction.DOT_PRODUCT, VectorStoreSimilarityMetric.DOT],
  ]);

  private readonly _client: Client;
  private readonly _options: ElasticsearchVectorStoreOptions;
  private readonly _initializeSchema: boolean;
  private readonly _filterExpressionConverter: FilterExpressionConverter;
  private _indexInitialized = false;

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

  /**
   * Creates a new builder instance for ElasticsearchVectorStore.
   * @returns a new ElasticsearchBuilder instance
   */
  static builder(
    client: Client,
    embeddingModel: EmbeddingModel,
  ): ElasticsearchVectorStoreBuilder {
    return new ElasticsearchVectorStoreBuilder(client, embeddingModel);
  }

  get client(): Client {
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

  async onModuleInit(): Promise<void> {
    await this.ensureIndexInitialized();
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    await this.ensureIndexInitialized();

    const embeddings = await this._embeddingModel.embed(
      documents,
      EmbeddingOptions.builder().build(),
      this._batchingStrategy,
    );

    const operations: NonNullable<
      estypes.BulkRequest<Record<string, unknown>>["operations"]
    > = [];
    for (let i = 0; i < embeddings.length; i += 1) {
      const document = documents[i];
      const embedding = embeddings[i];

      operations.push({
        index: {
          _index: this._options.indexName,
          _id: document.id,
        },
      });
      operations.push(
        this.getDocument(document, embedding, this._options.embeddingFieldName),
      );
    }

    const bulkResponse = await this._client.bulk({ operations });
    if (bulkResponse.errors) {
      for (const item of bulkResponse.items) {
        const reason = this.getBulkErrorReason(item);
        if (reason != null) {
          throw new Error(reason);
        }
      }
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    await this.ensureIndexInitialized();

    const operations: NonNullable<estypes.BulkRequest["operations"]> = [];
    for (const id of idList) {
      operations.push({
        delete: {
          _index: this._options.indexName,
          _id: id,
        },
      });
    }

    const bulkResponse = await this._client.bulk({ operations });
    if (bulkResponse.errors) {
      throw new Error("Delete operation failed");
    }
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    await this.ensureIndexInitialized();

    try {
      await this._client.deleteByQuery({
        index: this._options.indexName,
        query: {
          query_string: {
            query: this.getElasticsearchQueryString(filterExpression),
          },
        },
      });
    } catch (error) {
      throw new Error("Failed to delete documents by filter", {
        cause: error,
      });
    }
  }

  protected override async doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]> {
    assert(request != null, "The search request must not be null.");
    await this.ensureIndexInitialized();

    let threshold = request.similarityThreshold;
    // reverting l2_norm distance to its original value
    if (this._options.similarity === SimilarityFunction.L2_NORM) {
      threshold = 1 - threshold;
    }

    const vectors = await this._embeddingModel.embed(request.query);
    const response =
      await this._client.search<ElasticsearchVectorDocumentSource>({
        index: this._options.indexName,
        knn: {
          query_vector: vectors,
          similarity: threshold,
          k: request.topK,
          field: this._options.embeddingFieldName,
          num_candidates: Math.floor(1.5 * request.topK),
          filter: {
            query_string: {
              query: this.getElasticsearchQueryString(request.filterExpression),
            },
          },
        },
        size: request.topK,
      });

    return response.hits.hits.map((hit) => this.toDocument(hit));
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

  private getDocument(
    document: Document,
    embedding: number[],
    embeddingFieldName: string,
  ): Record<string, unknown> {
    assert(document.text != null, "document's text must not be null");

    return {
      id: document.id,
      content: document.text,
      metadata: document.metadata,
      [embeddingFieldName]: embedding,
    };
  }

  private getBulkErrorReason(
    item: estypes.BulkResponse["items"][number],
  ): string | null {
    const responseItem = Object.values(item)[0];
    return responseItem?.error?.reason ?? null;
  }

  private getElasticsearchQueryString(
    filterExpression: Filter.Expression | null,
  ): string {
    return filterExpression == null
      ? "*"
      : this._filterExpressionConverter.convertExpression(filterExpression);
  }

  private toDocument(
    hit: estypes.SearchHit<ElasticsearchVectorDocumentSource>,
  ): Document {
    const source = hit._source;
    assert(source != null, "source unexpectedly null");

    const id = source.id ?? hit._id ?? null;
    assert(id != null, "id must not be null");

    const content = source.content ?? "";
    const metadata = this.toMetadata(source.metadata);

    const documentBuilder = Document.builder()
      .id(id)
      .text(content)
      .metadata(metadata);

    if (hit._score != null) {
      const normalizedScore = this.normalizeSimilarityScore(hit._score);
      documentBuilder.metadata(DocumentMetadata.DISTANCE, 1 - normalizedScore);
      documentBuilder.score(normalizedScore);
    }

    return documentBuilder.build();
  }

  private toMetadata(
    metadata: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (metadata == null) {
      return {};
    }

    return { ...metadata };
  }

  // more info on score/distance calculation
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html#knn-similarity-search
  private normalizeSimilarityScore(score: number): number {
    switch (this._options.similarity) {
      case SimilarityFunction.L2_NORM:
        // the returned value of l2_norm is the opposite of the other functions
        // (closest to zero means more accurate), so to make it consistent
        // with the other functions the reverse is returned applying a "1-"
        // to the standard transformation
        return 1 - Math.sqrt(1 / score - 1);
      // cosine and dot_product
      default:
        return 2 * score - 1;
    }
  }

  private async ensureIndexInitialized(): Promise<void> {
    if (this._indexInitialized) {
      return;
    }

    // For the index to be present, either it must be pre-created or set the
    // initializeSchema to true.
    if (await this.indexExists()) {
      this._indexInitialized = true;
      return;
    }

    if (!this._initializeSchema) {
      throw new Error("Index not found");
    }

    await this.createIndexMapping();
    this._indexInitialized = true;
  }

  private async indexExists(): Promise<boolean> {
    return this._client.indices.exists({ index: this._options.indexName });
  }

  private async createIndexMapping(): Promise<void> {
    await this._client.indices.create({
      index: this._options.indexName,
      mappings: {
        properties: {
          [this._options.embeddingFieldName]: {
            type: "dense_vector",
            similarity: this.parseSimilarity(this._options.similarity),
            dims: this._options.dimensions,
          },
        },
      },
    });
  }

  private parseSimilarity(
    similarity: string,
  ): estypes.MappingDenseVectorSimilarity {
    switch (similarity.toLowerCase()) {
      case "cosine":
      case "dot_product":
      case "l2_norm":
        return similarity.toLowerCase() as estypes.MappingDenseVectorSimilarity;
      default:
        throw new Error(`Unsupported similarity: ${similarity}`);
    }
  }

  private getSimilarityMetric(): string {
    const metric = ElasticsearchVectorStore.SIMILARITY_TYPE_MAPPING.get(
      this._options.similarity,
    );
    return metric != null ? metric.value : this._options.similarity;
  }
}

export class ElasticsearchVectorStoreBuilder extends AbstractVectorStoreBuilder<ElasticsearchVectorStoreBuilder> {
  private readonly _client: Client;
  private _options = new ElasticsearchVectorStoreOptions();
  private _initializeSchema = false;
  private _filterExpressionConverter: FilterExpressionConverter =
    new ElasticsearchAiSearchFilterExpressionConverter();

  /**
   * Sets the Elasticsearch REST client.
   * @param client the Elasticsearch REST client
   * @param embeddingModel the Embedding Model to be used
   */
  constructor(client: Client, embeddingModel: EmbeddingModel) {
    super(embeddingModel);
    assert(client, "Elasticsearch client must not be null");
    this._client = client;
  }

  getClient(): Client {
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

  /**
   * Sets the Elasticsearch vector store options.
   * @param options the vector store options to use
   * @returns the builder instance
   * @throws IllegalArgumentException if options is null
   */
  options(
    options:
      | ElasticsearchVectorStoreOptions
      | ElasticsearchVectorStoreOptionsProps,
  ): this {
    assert(options != null, "options must not be null");
    this._options =
      options instanceof ElasticsearchVectorStoreOptions
        ? options
        : new ElasticsearchVectorStoreOptions(options);
    return this;
  }

  /**
   * Sets whether to initialize the schema.
   * @param initializeSchema true to initialize schema, false otherwise
   * @returns the builder instance
   */
  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchema = initializeSchema;
    return this;
  }

  /**
   * Sets the filter expression converter.
   * @param filterExpressionConverter the filter expression converter to use
   * @returns the builder instance
   * @throws IllegalArgumentException if converter is null
   */
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

  /**
   * Builds the ElasticsearchVectorStore instance.
   * @returns a new ElasticsearchVectorStore instance
   * @throws IllegalStateException if the builder is in an invalid state
   */
  override build(): ElasticsearchVectorStore {
    return new ElasticsearchVectorStore(this);
  }
}
