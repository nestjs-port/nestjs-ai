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
export class ModelUsageMetricsGenerator {
  private static readonly DESCRIPTION =
    "Measures number of input and output tokens used";

  private constructor() {}

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
