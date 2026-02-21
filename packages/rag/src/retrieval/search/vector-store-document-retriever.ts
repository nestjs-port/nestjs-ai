import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import { StringUtils } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval/query";
import { DocumentRetriever } from "./document-retriever";

/**
 * Represents a vector store that can perform similarity search.
 *
 * This is a minimal interface extracted for use within the RAG module.
 * The full VectorStore interface is defined elsewhere.
 */
export interface VectorStoreLike {
  similaritySearch(request: SearchRequestLike): Promise<Document[]>;
}

/**
 * Minimal search request interface for vector store queries.
 */
export interface SearchRequestLike {
  readonly query: string;
  readonly topK: number;
  readonly similarityThreshold: number;
  readonly filterExpression?: FilterExpression | null;
}

/**
 * Represents a filter expression for vector store queries.
 */
export type FilterExpression = unknown;

const SIMILARITY_THRESHOLD_ACCEPT_ALL = 0.0;

const DEFAULT_TOP_K = 4;

/**
 * Retrieves documents from a vector store that are semantically similar to the input
 * query. It supports filtering based on metadata, similarity threshold, and top-k
 * results.
 *
 * @example
 * ```typescript
 * const retriever = VectorStoreDocumentRetriever.builder()
 *   .vectorStore(vectorStore)
 *   .similarityThreshold(0.73)
 *   .topK(5)
 *   .filterExpression(filterExpression)
 *   .build();
 * const documents = await retriever.retrieve(new Query("example query"));
 * ```
 *
 * The `FILTER_EXPRESSION` context key can be used to provide a filter expression
 * for a specific query. This key accepts either a `FilterExpression` object directly
 * or a string representation.
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export class VectorStoreDocumentRetriever extends DocumentRetriever {
  static readonly FILTER_EXPRESSION = "vector_store_filter_expression";

  readonly vectorStore: VectorStoreLike;

  readonly similarityThreshold: number;

  readonly topK: number;

  private readonly _filterExpression: () => FilterExpression | null;

  /** @internal Use {@link VectorStoreDocumentRetriever.builder} instead. */
  constructor(
    vectorStore: VectorStoreLike,
    similarityThreshold?: number | null,
    topK?: number | null,
    filterExpression?: (() => FilterExpression | null) | null,
  ) {
    super();
    assert(vectorStore, "vectorStore cannot be null");
    assert(
      similarityThreshold == null || similarityThreshold >= 0.0,
      "similarityThreshold must be equal to or greater than 0.0",
    );
    assert(topK == null || topK > 0, "topK must be greater than 0");

    this.vectorStore = vectorStore;
    this.similarityThreshold =
      similarityThreshold ?? SIMILARITY_THRESHOLD_ACCEPT_ALL;
    this.topK = topK ?? DEFAULT_TOP_K;
    this._filterExpression = filterExpression ?? (() => null);
  }

  override async retrieve(query: Query): Promise<Document[]> {
    assert(query, "query cannot be null");
    const requestFilterExpression = this.computeRequestFilterExpression(query);
    const searchRequest: SearchRequestLike = {
      query: query.text,
      filterExpression: requestFilterExpression,
      similarityThreshold: this.similarityThreshold,
      topK: this.topK,
    };
    return this.vectorStore.similaritySearch(searchRequest);
  }

  private computeRequestFilterExpression(
    query: Query,
  ): FilterExpression | null {
    const contextFilterExpression = query.context[
      VectorStoreDocumentRetriever.FILTER_EXPRESSION
    ] as FilterExpression | string | undefined;

    if (contextFilterExpression != null) {
      if (typeof contextFilterExpression === "string") {
        if (StringUtils.hasText(contextFilterExpression)) {
          return contextFilterExpression;
        }
      } else {
        return contextFilterExpression;
      }
    }
    return this._filterExpression();
  }

  static builder(): VectorStoreDocumentRetrieverBuilder {
    return new VectorStoreDocumentRetrieverBuilder();
  }
}

export class VectorStoreDocumentRetrieverBuilder {
  private _vectorStore: VectorStoreLike | null = null;

  private _similarityThreshold: number | null = null;

  private _topK: number | null = null;

  private _filterExpression: (() => FilterExpression | null) | null = null;

  vectorStore(vectorStore: VectorStoreLike): this {
    this._vectorStore = vectorStore;
    return this;
  }

  similarityThreshold(similarityThreshold: number): this {
    this._similarityThreshold = similarityThreshold;
    return this;
  }

  topK(topK: number): this {
    this._topK = topK;
    return this;
  }

  filterExpression(filterExpression: FilterExpression): this;
  filterExpression(filterExpression: () => FilterExpression | null): this;
  filterExpression(
    filterExpression: FilterExpression | (() => FilterExpression | null),
  ): this {
    if (typeof filterExpression === "function") {
      this._filterExpression =
        filterExpression as () => FilterExpression | null;
    } else {
      this._filterExpression = () => filterExpression;
    }
    return this;
  }

  build(): VectorStoreDocumentRetriever {
    assert(this._vectorStore, "vectorStore cannot be null");
    return new VectorStoreDocumentRetriever(
      this._vectorStore,
      this._similarityThreshold,
      this._topK,
      this._filterExpression,
    );
  }
}
