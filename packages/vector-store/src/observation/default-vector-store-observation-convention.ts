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
  KeyValue,
  KeyValues,
  SpringAiKind,
  StringUtils,
  VectorStoreObservationAttributes,
} from "@nestjs-ai/commons";
import type { VectorStoreObservationContext } from "./vector-store-observation-context";
import { VectorStoreObservationConvention } from "./vector-store-observation-convention";

export class DefaultVectorStoreObservationConvention extends VectorStoreObservationConvention {
  static readonly DEFAULT_NAME = "db.vector.client.operation";

  private readonly _name: string;

  constructor(
    name: string = DefaultVectorStoreObservationConvention.DEFAULT_NAME,
  ) {
    super();
    this._name = name;
  }

  override getName(): string {
    return this._name;
  }

  override getContextualName(context: VectorStoreObservationContext): string {
    assert(context, "context cannot be null");
    return `${context.databaseSystem} ${context.operationName}`;
  }

  override getLowCardinalityKeyValues(
    context: VectorStoreObservationContext,
  ): KeyValues {
    assert(context, "context cannot be null");
    return KeyValues.of(
      this.springAiKind(),
      this.dbSystem(context),
      this.dbOperationName(context),
    );
  }

  protected springAiKind(): KeyValue {
    return KeyValue.of("spring.ai.kind", SpringAiKind.VECTOR_STORE.value);
  }

  protected dbSystem(context: VectorStoreObservationContext): KeyValue {
    return KeyValue.of(
      VectorStoreObservationAttributes.DB_SYSTEM.value,
      context.databaseSystem,
    );
  }

  protected dbOperationName(context: VectorStoreObservationContext): KeyValue {
    return KeyValue.of(
      VectorStoreObservationAttributes.DB_OPERATION_NAME.value,
      context.operationName,
    );
  }

  override getHighCardinalityKeyValues(
    context: VectorStoreObservationContext,
  ): KeyValues {
    assert(context, "context cannot be null");
    let keyValues = KeyValues.empty();
    keyValues = this.collectionName(keyValues, context);
    keyValues = this.dimensions(keyValues, context);
    keyValues = this.fieldName(keyValues, context);
    keyValues = this.metadataFilter(keyValues, context);
    keyValues = this.namespace(keyValues, context);
    keyValues = this.queryContent(keyValues, context);
    keyValues = this.similarityMetric(keyValues, context);
    keyValues = this.similarityThreshold(keyValues, context);
    keyValues = this.topK(keyValues, context);
    return keyValues;
  }

  protected collectionName(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (StringUtils.hasText(context.collectionName)) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_COLLECTION_NAME.value,
        context.collectionName,
      );
    }
    return keyValues;
  }

  protected dimensions(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (context.dimensions != null && context.dimensions > 0) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_DIMENSION_COUNT.value,
        String(context.dimensions),
      );
    }
    return keyValues;
  }

  protected fieldName(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (StringUtils.hasText(context.fieldName)) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_FIELD_NAME.value,
        context.fieldName,
      );
    }
    return keyValues;
  }

  protected metadataFilter(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (context.queryRequest?.filterExpression != null) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_FILTER.value,
        String(context.queryRequest.filterExpression),
      );
    }
    return keyValues;
  }

  protected namespace(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (StringUtils.hasText(context.namespace)) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_NAMESPACE.value,
        context.namespace,
      );
    }
    return keyValues;
  }

  protected queryContent(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (
      context.queryRequest != null &&
      StringUtils.hasText(context.queryRequest.query)
    ) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_CONTENT.value,
        context.queryRequest.query,
      );
    }
    return keyValues;
  }

  protected similarityMetric(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (StringUtils.hasText(context.similarityMetric)) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_SEARCH_SIMILARITY_METRIC.value,
        context.similarityMetric,
      );
    }
    return keyValues;
  }

  protected similarityThreshold(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (
      context.queryRequest != null &&
      context.queryRequest.similarityThreshold >= 0
    ) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_SIMILARITY_THRESHOLD
          .value,
        String(context.queryRequest.similarityThreshold),
      );
    }
    return keyValues;
  }

  protected topK(
    keyValues: KeyValues,
    context: VectorStoreObservationContext,
  ): KeyValues {
    if (context.queryRequest != null && context.queryRequest.topK > 0) {
      return keyValues.and(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_TOP_K.value,
        String(context.queryRequest.topK),
      );
    }
    return keyValues;
  }
}
