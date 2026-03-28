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
import {
  type Document,
  ObservationContext,
  StringUtils,
} from "@nestjs-ai/commons";
import type { SearchRequest } from "../search-request";

export interface VectorStoreObservationContextProps {
  databaseSystem: string;
  operationName: string | VectorStoreObservationContext.Operation;
  collectionName?: string | null;
  dimensions?: number | null;
  fieldName?: string | null;
  namespace?: string | null;
  similarityMetric?: string | null;
  queryRequest?: SearchRequest | null;
  queryResponse?: Document[] | null;
}

export class VectorStoreObservationContext extends ObservationContext {
  readonly databaseSystem: string;
  readonly operationName: string;
  readonly collectionName: string | null;
  readonly dimensions: number | null;
  readonly fieldName: string | null;
  readonly namespace: string | null;
  readonly similarityMetric: string | null;
  readonly queryRequest: SearchRequest | null;
  readonly queryResponse: Document[] | null;

  constructor({
    databaseSystem,
    operationName,
    collectionName = null,
    dimensions = null,
    fieldName = null,
    namespace = null,
    similarityMetric = null,
    queryRequest = null,
    queryResponse = null,
  }: VectorStoreObservationContextProps) {
    super();
    assert(
      StringUtils.hasText(databaseSystem),
      "databaseSystem cannot be null or empty",
    );
    const resolvedOperationName =
      operationName instanceof VectorStoreObservationContext.Operation
        ? operationName.value
        : operationName;
    assert(
      StringUtils.hasText(resolvedOperationName),
      "operationName cannot be null or empty",
    );
    this.databaseSystem = databaseSystem;
    this.operationName = resolvedOperationName;
    this.collectionName = collectionName;
    this.dimensions = dimensions;
    this.fieldName = fieldName;
    this.namespace = namespace;
    this.similarityMetric = similarityMetric;
    this.queryRequest = queryRequest;
    this.queryResponse = queryResponse;
  }

  static builder(
    databaseSystem: string,
    operationName: string | VectorStoreObservationContext.Operation,
  ): VectorStoreObservationContext.Builder {
    return new VectorStoreObservationContext.Builder(
      databaseSystem,
      operationName,
    );
  }
}

export namespace VectorStoreObservationContext {
  export class Operation {
    static readonly ADD = new Operation("add");
    static readonly DELETE = new Operation("delete");
    static readonly QUERY = new Operation("query");

    private constructor(public readonly value: string) {}
  }

  export class Builder {
    private readonly _databaseSystem: string;
    private readonly _operationName: string;
    private _collectionName: string | null = null;
    private _dimensions: number | null = null;
    private _fieldName: string | null = null;
    private _namespace: string | null = null;
    private _similarityMetric: string | null = null;
    private _queryRequest: SearchRequest | null = null;
    private _queryResponse: Document[] | null = null;

    constructor(
      databaseSystem: string,
      operationName: string | VectorStoreObservationContext.Operation,
    ) {
      this._databaseSystem = databaseSystem;
      this._operationName =
        operationName instanceof VectorStoreObservationContext.Operation
          ? operationName.value
          : operationName;
    }

    collectionName(collectionName: string | null): this {
      this._collectionName = collectionName;
      return this;
    }

    dimensions(dimensions: number | null): this {
      this._dimensions = dimensions;
      return this;
    }

    fieldName(fieldName: string | null): this {
      this._fieldName = fieldName;
      return this;
    }

    namespace(namespace: string | null): this {
      this._namespace = namespace;
      return this;
    }

    queryRequest(request: SearchRequest | null): this {
      this._queryRequest = request;
      return this;
    }

    queryResponse(documents: Document[] | null): this {
      this._queryResponse = documents;
      return this;
    }

    similarityMetric(similarityMetric: string | null): this {
      this._similarityMetric = similarityMetric;
      return this;
    }

    build(): VectorStoreObservationContext {
      return new VectorStoreObservationContext({
        databaseSystem: this._databaseSystem,
        operationName: this._operationName,
        collectionName: this._collectionName,
        dimensions: this._dimensions,
        fieldName: this._fieldName,
        namespace: this._namespace,
        similarityMetric: this._similarityMetric,
        queryRequest: this._queryRequest,
        queryResponse: this._queryResponse,
      });
    }
  }
}
