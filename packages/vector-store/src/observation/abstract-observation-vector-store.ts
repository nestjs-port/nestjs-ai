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
import type { Document } from "@nestjs-ai/commons";
import type { BatchingStrategy, EmbeddingModel } from "@nestjs-ai/model";
import { TokenCountBatchingStrategy } from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-port/core";
import type { Filter } from "../filter/index.js";
import type { SearchRequest } from "../search-request.js";
import { VectorStore } from "../vector-store.js";
import { DefaultVectorStoreObservationConvention } from "./default-vector-store-observation-convention.js";
import { VectorStoreObservationContext } from "./vector-store-observation-context.js";
import type { VectorStoreObservationConvention } from "./vector-store-observation-convention.js";
import { VectorStoreObservationDocumentation } from "./vector-store-observation-documentation.js";

export interface AbstractObservationVectorStoreProps {
  embeddingModel: EmbeddingModel;
  observationRegistry?: ObservationRegistry;
  customObservationConvention?: VectorStoreObservationConvention | null;
  batchingStrategy?: BatchingStrategy;
}

export abstract class AbstractObservationVectorStore extends VectorStore {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultVectorStoreObservationConvention();

  private static readonly AI_VECTOR_STORE =
    new VectorStoreObservationDocumentation();

  protected readonly _embeddingModel: EmbeddingModel;
  protected readonly _batchingStrategy: BatchingStrategy;
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _customObservationConvention: VectorStoreObservationConvention | null;

  protected constructor({
    embeddingModel,
    observationRegistry = NoopObservationRegistry.INSTANCE,
    customObservationConvention = null,
    batchingStrategy = new TokenCountBatchingStrategy(),
  }: AbstractObservationVectorStoreProps) {
    super();
    assert(embeddingModel, "EmbeddingModel must be configured");
    assert(observationRegistry, "ObservationRegistry must not be null");
    assert(batchingStrategy, "BatchingStrategy must not be null");
    this._embeddingModel = embeddingModel;
    this._observationRegistry = observationRegistry;
    this._customObservationConvention = customObservationConvention;
    this._batchingStrategy = batchingStrategy;
  }

  override async add(documents: Document[]): Promise<void> {
    assert(documents != null, "Documents list cannot be null");
    this.validateNonTextDocuments(documents);
    const observationContext = this.createObservationContextBuilder(
      VectorStoreObservationContext.Operation.ADD.value,
    ).build();

    await AbstractObservationVectorStore.AI_VECTOR_STORE.observation(
      this._customObservationConvention,
      AbstractObservationVectorStore.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    ).observe(() => this.doAdd(documents));
  }

  protected override async deleteByIdList(idList: string[]): Promise<void> {
    const observationContext = this.createObservationContextBuilder(
      VectorStoreObservationContext.Operation.DELETE.value,
    ).build();

    await AbstractObservationVectorStore.AI_VECTOR_STORE.observation(
      this._customObservationConvention,
      AbstractObservationVectorStore.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    ).observe(() => this.doDelete(idList));
  }

  protected override async deleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    const observationContext = this.createObservationContextBuilder(
      VectorStoreObservationContext.Operation.DELETE.value,
    ).build();

    await AbstractObservationVectorStore.AI_VECTOR_STORE.observation(
      this._customObservationConvention,
      AbstractObservationVectorStore.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    ).observe(() => this.doDeleteByFilterExpression(filterExpression));
  }

  protected override similaritySearchWithRequest(
    request: SearchRequest,
  ): Promise<Document[]> {
    const searchObservationContext = this.createObservationContextBuilder(
      VectorStoreObservationContext.Operation.QUERY.value,
    )
      .queryRequest(request)
      .build();

    return AbstractObservationVectorStore.AI_VECTOR_STORE.observation(
      this._customObservationConvention,
      AbstractObservationVectorStore.DEFAULT_OBSERVATION_CONVENTION,
      () => searchObservationContext,
      this._observationRegistry,
    ).observe(async () => {
      const documents = await this.doSimilaritySearch(request);
      this.setQueryResponse(searchObservationContext, documents);
      return documents;
    });
  }

  protected abstract doAdd(documents: Document[]): Promise<void>;

  protected abstract doDelete(idList: string[]): Promise<void>;

  protected doDeleteByFilterExpression(
    _filterExpression: Filter.Expression,
  ): Promise<void> {
    // this is temporary until we implement this method in all concrete vector stores,
    // at which point
    // this method will become an abstract method.
    throw new Error("UnsupportedOperationException");
  }

  protected abstract doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]>;

  protected abstract createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder;

  private validateNonTextDocuments(
    documents: readonly (Document | null)[],
  ): void {
    for (const document of documents) {
      if (document != null && !document.isText) {
        throw new Error(
          "Only text documents are supported for now. One of the documents contains non-text content.",
        );
      }
    }
  }

  private setQueryResponse(
    context: VectorStoreObservationContext,
    queryResponse: Document[],
  ): void {
    (
      context as unknown as {
        queryResponse: Document[] | null;
      }
    ).queryResponse = queryResponse;
  }
}
