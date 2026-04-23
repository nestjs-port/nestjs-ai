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

import { AiObservationAttributes } from "@nestjs-ai/commons";
import { KeyValue, KeyValues, StringUtils } from "@nestjs-port/core";
import type { ImageModelObservationContext } from "./image-model-observation-context.js";
import { ImageModelObservationConvention } from "./image-model-observation-convention.js";

export class DefaultImageModelObservationConvention extends ImageModelObservationConvention {
  static readonly DEFAULT_NAME = "gen_ai.client.operation";

  private static readonly REQUEST_MODEL_NONE = KeyValue.of(
    AiObservationAttributes.REQUEST_MODEL.value,
    KeyValue.NONE_VALUE,
  );

  override getName(): string {
    return DefaultImageModelObservationConvention.DEFAULT_NAME;
  }

  override getContextualName(context: ImageModelObservationContext): string {
    const model = context.request.options?.model;
    if (StringUtils.hasText(model)) {
      return `${context.operationMetadata.operationType} ${model}`;
    }
    return context.operationMetadata.operationType;
  }

  override getLowCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues {
    return KeyValues.of(
      this.aiOperationType(context),
      this.aiProvider(context),
      this.requestModel(context),
    );
  }

  protected aiOperationType(context: ImageModelObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_OPERATION_TYPE.value,
      context.operationMetadata.operationType,
    );
  }

  protected aiProvider(context: ImageModelObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_PROVIDER.value,
      context.operationMetadata.provider,
    );
  }

  protected requestModel(context: ImageModelObservationContext): KeyValue {
    const model = context.request.options?.model;
    if (StringUtils.hasText(model)) {
      return KeyValue.of(AiObservationAttributes.REQUEST_MODEL.value, model);
    }
    return DefaultImageModelObservationConvention.REQUEST_MODEL_NONE;
  }

  override getHighCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues {
    let keyValues = KeyValues.empty();
    // Request
    keyValues = this.requestImageFormat(keyValues, context);
    keyValues = this.requestImageSize(keyValues, context);
    keyValues = this.requestImageStyle(keyValues, context);
    return keyValues;
  }

  // Request

  protected requestImageFormat(
    keyValues: KeyValues,
    context: ImageModelObservationContext,
  ): KeyValues {
    const responseFormat = context.request.options?.responseFormat;
    if (StringUtils.hasText(responseFormat)) {
      return keyValues.and(
        AiObservationAttributes.REQUEST_IMAGE_RESPONSE_FORMAT.value,
        responseFormat,
      );
    }
    return keyValues;
  }

  protected requestImageSize(
    keyValues: KeyValues,
    context: ImageModelObservationContext,
  ): KeyValues {
    const options = context.request.options;
    if (options?.width != null && options.height != null) {
      return keyValues.and(
        AiObservationAttributes.REQUEST_IMAGE_SIZE.value,
        `${options.width}x${options.height}`,
      );
    }
    return keyValues;
  }

  protected requestImageStyle(
    keyValues: KeyValues,
    context: ImageModelObservationContext,
  ): KeyValues {
    const style = context.request.options?.style;
    if (StringUtils.hasText(style)) {
      return keyValues.and(
        AiObservationAttributes.REQUEST_IMAGE_STYLE.value,
        style,
      );
    }
    return keyValues;
  }
}
