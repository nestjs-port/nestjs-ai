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
import { type Filter, FilterExpressionTextParser } from "./filter/index.js";

export class SearchRequest {
  static readonly SIMILARITY_THRESHOLD_ACCEPT_ALL = 0.0;
  static readonly DEFAULT_TOP_K = 4;

  private _query = "";
  private _topK = SearchRequest.DEFAULT_TOP_K;
  private _similarityThreshold = SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL;
  private _filterExpression: Filter.Expression | null = null;

  constructor(original?: SearchRequest) {
    if (original != null) {
      this._query = original.query;
      this._topK = original.topK;
      this._similarityThreshold = original.similarityThreshold;
      this._filterExpression = original.filterExpression;
    }
  }

  static from(originalSearchRequest: SearchRequest): SearchRequestBuilder {
    return SearchRequest.builder()
      .query(originalSearchRequest.query)
      .topK(originalSearchRequest.topK)
      .similarityThreshold(originalSearchRequest.similarityThreshold)
      .filterExpression(originalSearchRequest.filterExpression);
  }

  static builder(): SearchRequestBuilder {
    return new SearchRequestBuilder();
  }

  get query(): string {
    return this._query;
  }

  get topK(): number {
    return this._topK;
  }

  get similarityThreshold(): number {
    return this._similarityThreshold;
  }

  get filterExpression(): Filter.Expression | null {
    return this._filterExpression;
  }

  _setQuery(query: string): void {
    this._query = query;
  }

  _setTopK(topK: number): void {
    this._topK = topK;
  }

  _setSimilarityThreshold(similarityThreshold: number): void {
    this._similarityThreshold = similarityThreshold;
  }

  _setFilterExpression(filterExpression: Filter.Expression | null): void {
    this._filterExpression = filterExpression;
  }

  hasFilterExpression(): boolean {
    return this._filterExpression != null;
  }
}

export class SearchRequestBuilder {
  private readonly _searchRequest = new SearchRequest();

  query(query: string): this {
    assert(query != null, "Query can not be null.");
    this._searchRequest._setQuery(query);
    return this;
  }

  topK(topK: number): this {
    assert(topK >= 0, "TopK should be positive.");
    this._searchRequest._setTopK(topK);
    return this;
  }

  similarityThreshold(threshold: number): this {
    assert(
      threshold >= 0 && threshold <= 1,
      "Similarity threshold must be in [0,1] range.",
    );
    this._searchRequest._setSimilarityThreshold(threshold);
    return this;
  }

  similarityThresholdAll(): this {
    this._searchRequest._setSimilarityThreshold(
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
    );
    return this;
  }

  filterExpression(expression: Filter.Expression | null): this;
  filterExpression(textExpression: string | null): this;
  filterExpression(expressionOrText: Filter.Expression | string | null): this {
    if (typeof expressionOrText === "string") {
      this._searchRequest._setFilterExpression(
        new FilterExpressionTextParser().parse(expressionOrText),
      );
      return this;
    }
    this._searchRequest._setFilterExpression(expressionOrText);
    return this;
  }

  build(): SearchRequest {
    return this._searchRequest;
  }
}
