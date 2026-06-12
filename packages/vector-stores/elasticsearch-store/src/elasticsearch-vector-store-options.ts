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
  /**
   * The name of the index to store the vectors.
   */
  indexName?: string;

  /**
   * The number of dimensions in the vector.
   */
  dimensions?: number;

  /**
   * The similarity function to use.
   */
  similarity?: SimilarityFunction;

  /**
   * The name of the vector field to search against
   */
  embeddingFieldName?: string;
}

/**
 * Provided Elasticsearch vector option configuration.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html
 */
export class ElasticsearchVectorStoreOptions {
  private readonly _indexName: string;
  private readonly _dimensions: number;
  private readonly _similarity: SimilarityFunction;
  private readonly _embeddingFieldName: string;

  constructor(props: ElasticsearchVectorStoreOptionsProps = {}) {
    this._indexName = props.indexName ?? "spring-ai-document-index";
    this._dimensions = props.dimensions ?? 1536;
    this._similarity = props.similarity ?? SimilarityFunction.COSINE;
    this._embeddingFieldName = props.embeddingFieldName ?? "embedding";
  }

  /**
   * The name of the index to store the vectors.
   */
  get indexName(): string {
    return this._indexName;
  }

  /**
   * The number of dimensions in the vector.
   */
  get dimensions(): number {
    return this._dimensions;
  }

  /**
   * The similarity function to use.
   */
  get similarity(): SimilarityFunction {
    return this._similarity;
  }

  /**
   * The name of the vector field to search against
   */
  get embeddingFieldName(): string {
    return this._embeddingFieldName;
  }
}
