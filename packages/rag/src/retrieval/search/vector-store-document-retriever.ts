import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import { StringUtils } from "@nestjs-ai/commons";
import {
  Filter,
  FilterExpressionTextParser,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import type { Query } from "../../query";
import { DocumentRetriever } from "./document-retriever";

export interface VectorStoreDocumentRetrieverProps {
  vectorStore: VectorStore;
  similarityThreshold?: number | null;
  topK?: number | null;
  filterExpression?:
    | Filter.Expression
    | (() => Filter.Expression | null)
    | null;
}

export class VectorStoreDocumentRetriever extends DocumentRetriever {
  static readonly FILTER_EXPRESSION = "vector_store_filter_expression";

  private readonly _vectorStore: VectorStore;
  private readonly _similarityThreshold: number;
  private readonly _topK: number;
  private readonly _filterExpression: () => Filter.Expression | null;

  constructor(props: VectorStoreDocumentRetrieverProps) {
    super();
    assert(props.vectorStore != null, "vectorStore cannot be null");

    const similarityThreshold =
      props.similarityThreshold ??
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL;
    assert(
      similarityThreshold >= 0.0,
      "similarityThreshold must be equal to or greater than 0.0",
    );

    const topK = props.topK ?? SearchRequest.DEFAULT_TOP_K;
    assert(topK > 0, "topK must be greater than 0");

    let filterExpression: () => Filter.Expression | null = () => null;
    if (typeof props.filterExpression === "function") {
      filterExpression = props.filterExpression;
    } else if (props.filterExpression !== undefined) {
      const configuredFilterExpression = props.filterExpression;
      filterExpression = () => configuredFilterExpression ?? null;
    }

    this._vectorStore = props.vectorStore;
    this._similarityThreshold = similarityThreshold;
    this._topK = topK;
    this._filterExpression = filterExpression;
  }

  override retrieve(query: Query): Promise<Document[]> {
    assert(query != null, "query cannot be null");
    const requestFilterExpression = this.computeRequestFilterExpression(query);
    const searchRequest = SearchRequest.builder()
      .query(query.text)
      .filterExpression(requestFilterExpression)
      .similarityThreshold(this._similarityThreshold)
      .topK(this._topK)
      .build();
    return this._vectorStore.similaritySearch(searchRequest);
  }

  private computeRequestFilterExpression(
    query: Query,
  ): Filter.Expression | null {
    const contextFilterExpression =
      query.context[VectorStoreDocumentRetriever.FILTER_EXPRESSION];
    if (contextFilterExpression != null) {
      if (contextFilterExpression instanceof Filter.Expression) {
        return contextFilterExpression;
      }
      const textFilterExpression = contextFilterExpression.toString();
      if (StringUtils.hasText(textFilterExpression)) {
        return new FilterExpressionTextParser().parse(textFilterExpression);
      }
    }
    return this._filterExpression();
  }
}
