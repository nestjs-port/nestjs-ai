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

import type { Document } from "mongodb";

/**
 * Parses a MongoDB Atlas filter expression string produced by the
 * {@link MongoDBAtlasFilterExpressionConverter} into a query object. The converter
 * emits operator keys (e.g. `$eq`) without quotes, following MongoDB's relaxed
 * extended JSON syntax, so they are quoted before JSON parsing.
 */
export function parseFilterExpression(filter: string): Record<string, unknown> {
  const normalized = filter.replace(
    /([{,]\s*)(\$[a-zA-Z]+)(\s*:)/g,
    `$1"$2"$3`,
  );
  return JSON.parse(normalized) as Record<string, unknown>;
}

export class VectorSearchAggregation {
  constructor(
    private readonly _embeddings: number[],
    private readonly _path: string,
    private readonly _numCandidates: number,
    private readonly _index: string,
    private readonly _count: number,
    private readonly _filter: string,
  ) {}

  toDocument(): Document {
    const vectorSearch: Document = {
      queryVector: this._embeddings,
      path: this._path,
      numCandidates: this._numCandidates,
      index: this._index,
      limit: this._count,
    };

    if (this._filter !== "") {
      vectorSearch.filter = parseFilterExpression(this._filter);
    }

    return {
      $vectorSearch: vectorSearch,
    };
  }
}
