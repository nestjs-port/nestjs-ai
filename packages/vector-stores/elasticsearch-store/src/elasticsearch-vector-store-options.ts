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

import { SimilarityFunction } from "./similarity-function.js";

export interface ElasticsearchVectorStoreOptionsProps {
  indexName?: string;
  dimensions?: number;
  similarity?: SimilarityFunction;
  embeddingFieldName?: string;
}

export class ElasticsearchVectorStoreOptions {
  static readonly DEFAULT_INDEX_NAME = "spring-ai-document-index";
  static readonly DEFAULT_DIMENSIONS = 1536;
  static readonly DEFAULT_SIMILARITY = SimilarityFunction.COSINE;
  static readonly DEFAULT_EMBEDDING_FIELD_NAME = "embedding";

  private readonly _indexName: string;
  private readonly _dimensions: number;
  private readonly _similarity: SimilarityFunction;
  private readonly _embeddingFieldName: string;

  constructor(props: ElasticsearchVectorStoreOptionsProps = {}) {
    this._indexName =
      props.indexName ?? ElasticsearchVectorStoreOptions.DEFAULT_INDEX_NAME;
    this._dimensions =
      props.dimensions ?? ElasticsearchVectorStoreOptions.DEFAULT_DIMENSIONS;
    this._similarity =
      props.similarity ?? ElasticsearchVectorStoreOptions.DEFAULT_SIMILARITY;
    this._embeddingFieldName =
      props.embeddingFieldName ??
      ElasticsearchVectorStoreOptions.DEFAULT_EMBEDDING_FIELD_NAME;
  }

  get indexName(): string {
    return this._indexName;
  }

  get dimensions(): number {
    return this._dimensions;
  }

  get similarity(): SimilarityFunction {
    return this._similarity;
  }

  get embeddingFieldName(): string {
    return this._embeddingFieldName;
  }
}
