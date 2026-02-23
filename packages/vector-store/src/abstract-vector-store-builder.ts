import assert from "node:assert/strict";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import type { BatchingStrategy, EmbeddingModel } from "@nestjs-ai/model";
import { TokenCountBatchingStrategy } from "@nestjs-ai/model";
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
