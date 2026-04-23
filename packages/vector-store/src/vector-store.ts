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
import type { Document, DocumentWriter } from "@nestjs-ai/commons";
import type { BatchingStrategy } from "@nestjs-ai/model";
import type { ObservationRegistry } from "@nestjs-port/core";
import type { Filter } from "./filter/index.js";
import type { VectorStoreObservationConvention } from "./observation/index.js";
import { SearchRequest } from "./search-request.js";
import { VectorStoreRetriever } from "./vector-store-retriever.js";

export abstract class VectorStore
  extends VectorStoreRetriever
  implements DocumentWriter
{
  get name(): string {
    return this.constructor.name;
  }

  abstract add(documents: Document[]): Promise<void>;

  async write(documents: Document[]): Promise<void> {
    await this.add(documents);
  }

  delete(idList: string[]): Promise<void>;
  delete(filterExpression: Filter.Expression): Promise<void>;
  delete(filterExpression: string): Promise<void>;
  async delete(
    idListOrFilterExpression: string[] | Filter.Expression | string,
  ): Promise<void> {
    if (Array.isArray(idListOrFilterExpression)) {
      await this.deleteByIdList(idListOrFilterExpression);
      return;
    }

    if (typeof idListOrFilterExpression === "string") {
      const searchRequest = SearchRequest.builder()
        .filterExpression(idListOrFilterExpression)
        .build();
      const textExpression = searchRequest.filterExpression;
      assert(textExpression != null, "Filter expression must not be null");
      await this.deleteByFilterExpression(textExpression);
      return;
    }

    await this.deleteByFilterExpression(idListOrFilterExpression);
  }

  protected abstract deleteByIdList(idList: string[]): Promise<void>;

  protected abstract deleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void>;

  getNativeClient<T>(): T | null {
    return null;
  }
}

export namespace VectorStore {
  export interface Builder<T extends Builder<T>> {
    observationRegistry(observationRegistry: ObservationRegistry): T;

    customObservationConvention(
      convention: VectorStoreObservationConvention | null,
    ): T;

    batchingStrategy(batchingStrategy: BatchingStrategy): T;

    build(): VectorStore;
  }
}
