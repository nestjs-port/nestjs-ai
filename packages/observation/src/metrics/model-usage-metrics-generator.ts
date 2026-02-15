import {
	AiObservationMetricAttributes,
	AiObservationMetricNames,
	AiTokenType,
} from "@nestjs-ai/commons";
import type { ChatModelObservationContext } from "@nestjs-ai/model";
import type { Counter, Meter } from "@opentelemetry/api";

/**
 * Generates token usage metrics from chat model observation contexts.
 * Creates OpenTelemetry counters for input, output, and total tokens.
 */
export class ModelUsageMetricsGenerator {
	private readonly _tokenUsageCounter: Counter;

	constructor(meter: Meter) {
		this._tokenUsageCounter = meter.createCounter(
			AiObservationMetricNames.TOKEN_USAGE.value,
			{
				description: "Number of tokens used in GenAI operations",
				unit: "{token}",
			},
		);
	}

	generate(context: ChatModelObservationContext): void {
		const response = context.response;
		if (!response) {
			return;
		}

		const usage = response.metadata?.usage;
		if (!usage) {
			return;
		}

		// Build common attributes from low-cardinality key values
		const commonAttributes: Record<string, string> = {};
		for (const [key, value] of context.lowCardinalityKeyValues) {
			commonAttributes[key] = value;
		}

		const inputTokens = usage.promptTokens ?? 0;
		const outputTokens = usage.completionTokens ?? 0;
		const totalTokens = usage.totalTokens ?? 0;

		if (inputTokens > 0) {
			this._tokenUsageCounter.add(inputTokens, {
				...commonAttributes,
				[AiObservationMetricAttributes.TOKEN_TYPE.value]:
					AiTokenType.INPUT.value,
			});
		}

		if (outputTokens > 0) {
			this._tokenUsageCounter.add(outputTokens, {
				...commonAttributes,
				[AiObservationMetricAttributes.TOKEN_TYPE.value]:
					AiTokenType.OUTPUT.value,
			});
		}

		if (totalTokens > 0) {
			this._tokenUsageCounter.add(totalTokens, {
				...commonAttributes,
				[AiObservationMetricAttributes.TOKEN_TYPE.value]:
					AiTokenType.TOTAL.value,
			});
		}
	}
}
