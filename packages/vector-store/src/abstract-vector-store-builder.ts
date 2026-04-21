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
import type { BatchingStrategy, EmbeddingModel } from "@nestjs-ai/model";
import { TokenCountBatchingStrategy } from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-port/core";
import type { VectorStoreObservationConvention } from "./observation";
import type { VectorStore } from "./vector-store";

export abstract class AbstractVectorStoreBuilder<
  T extends AbstractVectorStoreBuilder<T>,
> implements VectorStore.Builder<T>
{
  protected readonly _embeddingModel: EmbeddingModel;
  protected _observationRegistry: ObservationRegistry =
    NoopObservationRegistry.INSTANCE;
  protected _customObservationConvention: VectorStoreObservationConvention | null =
    null;
  protected _batchingStrategy: BatchingStrategy =
    new TokenCountBatchingStrategy();

  protected constructor(embeddingModel: EmbeddingModel) {
    assert(embeddingModel, "EmbeddingModel must be configured");
    this._embeddingModel = embeddingModel;
  }

  get embeddingModel(): EmbeddingModel {
    return this._embeddingModel;
  }

  get configuredBatchingStrategy(): BatchingStrategy {
    return this._batchingStrategy;
  }

  get configuredObservationRegistry(): ObservationRegistry {
    return this._observationRegistry;
  }

  get configuredObservationConvention(): VectorStoreObservationConvention | null {
    return this._customObservationConvention;
  }

  protected self(): T {
    return this as unknown as T;
  }

  observationRegistry(observationRegistry: ObservationRegistry): T {
    assert(observationRegistry, "ObservationRegistry must not be null");
    this._observationRegistry = observationRegistry;
    return this.self();
  }

  customObservationConvention(
    convention: VectorStoreObservationConvention | null,
  ): T {
    this._customObservationConvention = convention;
    return this.self();
  }

  batchingStrategy(batchingStrategy: BatchingStrategy): T {
    assert(batchingStrategy, "BatchingStrategy must not be null");
    this._batchingStrategy = batchingStrategy;
    return this.self();
  }

  abstract build(): VectorStore;
}
