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

import {
  AiObservationAttributes,
  KeyValue,
  KeyValues,
  StringUtils,
} from "@nestjs-ai/commons";
import type { EmbeddingOptions } from "../embedding-options.interface";
import type { EmbeddingModelObservationContext } from "./embedding-model-observation-context";
import { EmbeddingModelObservationConvention } from "./embedding-model-observation-convention";

export class DefaultEmbeddingModelObservationConvention extends EmbeddingModelObservationConvention {
  static readonly DEFAULT_NAME = "gen_ai.client.operation";

  private static readonly REQUEST_MODEL_NONE = KeyValue.of(
    AiObservationAttributes.REQUEST_MODEL.value,
    KeyValue.NONE_VALUE,
  );

  private static readonly RESPONSE_MODEL_NONE = KeyValue.of(
    AiObservationAttributes.RESPONSE_MODEL.value,
    KeyValue.NONE_VALUE,
  );

  override getName(): string {
    return DefaultEmbeddingModelObservationConvention.DEFAULT_NAME;
  }

  override getContextualName(
    context: EmbeddingModelObservationContext,
  ): string {
    const model = (context.request.options as EmbeddingOptions | null)?.model;
    if (StringUtils.hasText(model)) {
      return `${context.operationMetadata.operationType} ${model}`;
    }
    return context.operationMetadata.operationType;
  }

  override getLowCardinalityKeyValues(
    context: EmbeddingModelObservationContext,
  ): KeyValues {
    return KeyValues.of(
      this.aiOperationType(context),
      this.aiProvider(context),
      this.requestModel(context),
      this.responseModel(context),
    );
  }

  protected aiOperationType(
    context: EmbeddingModelObservationContext,
  ): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_OPERATION_TYPE.value,
      context.operationMetadata.operationType,
    );
  }

  protected aiProvider(context: EmbeddingModelObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_PROVIDER.value,
      context.operationMetadata.provider,
    );
  }

  protected requestModel(context: EmbeddingModelObservationContext): KeyValue {
    const model = (context.request.options as EmbeddingOptions | null)?.model;
    if (StringUtils.hasText(model)) {
      return KeyValue.of(AiObservationAttributes.REQUEST_MODEL.value, model);
    }
    return DefaultEmbeddingModelObservationConvention.REQUEST_MODEL_NONE;
  }

  protected responseModel(context: EmbeddingModelObservationContext): KeyValue {
    const model = context.response?.metadata?.model;
    if (StringUtils.hasText(model)) {
      return KeyValue.of(AiObservationAttributes.RESPONSE_MODEL.value, model);
    }
    return DefaultEmbeddingModelObservationConvention.RESPONSE_MODEL_NONE;
  }

  override getHighCardinalityKeyValues(
    context: EmbeddingModelObservationContext,
  ): KeyValues {
    let keyValues = KeyValues.empty();
    // Request
    keyValues = this.requestEmbeddingDimension(keyValues, context);
    // Response
    keyValues = this.usageInputTokens(keyValues, context);
    keyValues = this.usageTotalTokens(keyValues, context);
    return keyValues;
  }

  // Request

  protected requestEmbeddingDimension(
    keyValues: KeyValues,
    context: EmbeddingModelObservationContext,
  ): KeyValues {
    const dimensions = (context.request.options as EmbeddingOptions | null)
      ?.dimensions;
    if (dimensions != null) {
      return keyValues.and(
        AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value,
        String(dimensions),
      );
    }
    return keyValues;
  }

  // Response

  protected usageInputTokens(
    keyValues: KeyValues,
    context: EmbeddingModelObservationContext,
  ): KeyValues {
    const promptTokens = context.response?.metadata?.usage?.promptTokens;
    if (promptTokens != null) {
      return keyValues.and(
        AiObservationAttributes.USAGE_INPUT_TOKENS.value,
        String(promptTokens),
      );
    }
    return keyValues;
  }

  protected usageTotalTokens(
    keyValues: KeyValues,
    context: EmbeddingModelObservationContext,
  ): KeyValues {
    const totalTokens = context.response?.metadata?.usage?.totalTokens;
    if (totalTokens != null) {
      return keyValues.and(
        AiObservationAttributes.USAGE_TOTAL_TOKENS.value,
        String(totalTokens),
      );
    }
    return keyValues;
  }
}
