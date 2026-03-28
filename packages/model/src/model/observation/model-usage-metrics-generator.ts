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
  AiObservationMetricAttributes,
  AiObservationMetricNames,
  AiTokenType,
  Counter,
  type MeterRegistry,
  type ObservationContext,
  Tag,
} from "@nestjs-ai/commons";
import type { Usage } from "../../chat";

/**
 * Generate metrics about the model usage in the context of an AI operation.
 */
export abstract class ModelUsageMetricsGenerator {
  private static readonly DESCRIPTION =
    "Measures number of input and output tokens used";

  static generate(
    usage: Usage,
    context: ObservationContext,
    meterRegistry: MeterRegistry,
  ): void {
    if (usage.promptTokens != null) {
      Counter.builder(AiObservationMetricNames.TOKEN_USAGE.value)
        .tag(
          AiObservationMetricAttributes.TOKEN_TYPE.value,
          AiTokenType.INPUT.value,
        )
        .description(ModelUsageMetricsGenerator.DESCRIPTION)
        .tags(ModelUsageMetricsGenerator.createTags(context))
        .register(meterRegistry)
        .increment(usage.promptTokens);
    }

    if (usage.completionTokens != null) {
      Counter.builder(AiObservationMetricNames.TOKEN_USAGE.value)
        .tag(
          AiObservationMetricAttributes.TOKEN_TYPE.value,
          AiTokenType.OUTPUT.value,
        )
        .description(ModelUsageMetricsGenerator.DESCRIPTION)
        .tags(ModelUsageMetricsGenerator.createTags(context))
        .register(meterRegistry)
        .increment(usage.completionTokens);
    }

    if (usage.totalTokens != null) {
      Counter.builder(AiObservationMetricNames.TOKEN_USAGE.value)
        .tag(
          AiObservationMetricAttributes.TOKEN_TYPE.value,
          AiTokenType.TOTAL.value,
        )
        .description(ModelUsageMetricsGenerator.DESCRIPTION)
        .tags(ModelUsageMetricsGenerator.createTags(context))
        .register(meterRegistry)
        .increment(usage.totalTokens);
    }
  }

  private static createTags(context: ObservationContext): Tag[] {
    const tags: Tag[] = [];
    for (const keyValue of context.lowCardinalityKeyValues) {
      tags.push(Tag.of(keyValue.key, keyValue.value));
    }
    return tags;
  }
}
