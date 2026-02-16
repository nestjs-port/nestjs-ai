import {
	AiObservationAttributes,
	KeyValue,
	KeyValues,
} from "@nestjs-ai/commons";
import type { ToolCallingChatOptions } from "../../model";
import type { ChatOptions } from "../prompt";
import type { ChatModelObservationContext } from "./chat-model-observation-context";
import { ChatModelObservationConvention } from "./chat-model-observation-convention";

export class DefaultChatModelObservationConvention extends ChatModelObservationConvention {
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
		return DefaultChatModelObservationConvention.DEFAULT_NAME;
	}

	override getContextualName(context: ChatModelObservationContext): string {
		const options = context.request.options as ChatOptions | null;
		if (options != null && this.hasText(options.model)) {
			return `${context.operationMetadata.operationType} ${options.model}`;
		}
		return context.operationMetadata.operationType;
	}

	override getLowCardinalityKeyValues(
		context: ChatModelObservationContext,
	): KeyValue[] {
		return KeyValues.of(
			this.aiOperationType(context),
			this.aiProvider(context),
			this.requestModel(context),
			this.responseModel(context),
		).toArray();
	}

	protected aiOperationType(context: ChatModelObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_OPERATION_TYPE.value,
			context.operationMetadata.operationType,
		);
	}

	protected aiProvider(context: ChatModelObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_PROVIDER.value,
			context.operationMetadata.provider,
		);
	}

	protected requestModel(context: ChatModelObservationContext): KeyValue {
		const options = context.request.options as ChatOptions | null;
		if (options != null && this.hasText(options.model)) {
			return KeyValue.of(
				AiObservationAttributes.REQUEST_MODEL.value,
				options.model,
			);
		}
		return DefaultChatModelObservationConvention.REQUEST_MODEL_NONE;
	}

	protected responseModel(context: ChatModelObservationContext): KeyValue {
		const model = context.response?.metadata?.model;
		if (this.hasText(model)) {
			return KeyValue.of(AiObservationAttributes.RESPONSE_MODEL.value, model);
		}
		return DefaultChatModelObservationConvention.RESPONSE_MODEL_NONE;
	}

	override getHighCardinalityKeyValues(
		context: ChatModelObservationContext,
	): KeyValue[] {
		let keyValues = KeyValues.empty();
		// Request
		keyValues = this.requestFrequencyPenalty(keyValues, context);
		keyValues = this.requestMaxTokens(keyValues, context);
		keyValues = this.requestPresencePenalty(keyValues, context);
		keyValues = this.requestStopSequences(keyValues, context);
		keyValues = this.requestTemperature(keyValues, context);
		keyValues = this.requestTools(keyValues, context);
		keyValues = this.requestTopK(keyValues, context);
		keyValues = this.requestTopP(keyValues, context);
		// Response
		keyValues = this.responseFinishReasons(keyValues, context);
		keyValues = this.responseId(keyValues, context);
		keyValues = this.usageInputTokens(keyValues, context);
		keyValues = this.usageOutputTokens(keyValues, context);
		keyValues = this.usageTotalTokens(keyValues, context);
		return keyValues.toArray();
	}

	// Request

	protected requestFrequencyPenalty(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.frequencyPenalty != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_FREQUENCY_PENALTY.value,
				String(options.frequencyPenalty),
			);
		}
		return keyValues;
	}

	protected requestMaxTokens(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.maxTokens != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_MAX_TOKENS.value,
				String(options.maxTokens),
			);
		}
		return keyValues;
	}

	protected requestPresencePenalty(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.presencePenalty != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_PRESENCE_PENALTY.value,
				String(options.presencePenalty),
			);
		}
		return keyValues;
	}

	protected requestStopSequences(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (
			options != null &&
			options.stopSequences != null &&
			options.stopSequences.length > 0
		) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_STOP_SEQUENCES.value,
				this.formatQuotedArray(options.stopSequences),
			);
		}
		return keyValues;
	}

	protected requestTemperature(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.temperature != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_TEMPERATURE.value,
				String(options.temperature),
			);
		}
		return keyValues;
	}

	protected requestTools(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = this.toolCallingOptions(context);
		if (options == null) {
			return keyValues;
		}

		const toolNames = new Set<string>(options.toolNames);
		for (const toolCallback of options.toolCallbacks) {
			toolNames.add(toolCallback.toolDefinition.name);
		}

		if (toolNames.size > 0) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_TOOL_NAMES.value,
				this.formatQuotedArray(toolNames),
			);
		}
		return keyValues;
	}

	protected requestTopK(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.topK != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_TOP_K.value,
				String(options.topK),
			);
		}
		return keyValues;
	}

	protected requestTopP(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const options = context.request.options as ChatOptions | null;
		if (options != null && options.topP != null) {
			return keyValues.and(
				AiObservationAttributes.REQUEST_TOP_P.value,
				String(options.topP),
			);
		}
		return keyValues;
	}

	// Response

	protected responseFinishReasons(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const response = context.response;
		if (response != null && response.results.length > 0) {
			const finishReasons = response.results
				.map((generation) => generation.metadata.finishReason)
				.filter((finishReason): finishReason is string =>
					this.hasText(finishReason),
				);

			if (finishReasons.length === 0) {
				return keyValues;
			}

			return keyValues.and(
				AiObservationAttributes.RESPONSE_FINISH_REASONS.value,
				this.formatQuotedArray(finishReasons),
			);
		}
		return keyValues;
	}

	protected responseId(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const id = context.response?.metadata?.id;
		if (this.hasText(id)) {
			return keyValues.and(AiObservationAttributes.RESPONSE_ID.value, id);
		}
		return keyValues;
	}

	protected usageInputTokens(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const usage = context.response?.metadata?.usage;
		if (usage != null && usage.promptTokens != null) {
			return keyValues.and(
				AiObservationAttributes.USAGE_INPUT_TOKENS.value,
				String(usage.promptTokens),
			);
		}
		return keyValues;
	}

	protected usageOutputTokens(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const usage = context.response?.metadata?.usage;
		if (usage != null && usage.completionTokens != null) {
			return keyValues.and(
				AiObservationAttributes.USAGE_OUTPUT_TOKENS.value,
				String(usage.completionTokens),
			);
		}
		return keyValues;
	}

	protected usageTotalTokens(
		keyValues: KeyValues,
		context: ChatModelObservationContext,
	): KeyValues {
		const usage = context.response?.metadata?.usage;
		if (usage != null && usage.totalTokens != null) {
			return keyValues.and(
				AiObservationAttributes.USAGE_TOTAL_TOKENS.value,
				String(usage.totalTokens),
			);
		}
		return keyValues;
	}

	protected hasText(value: string | null | undefined): value is string {
		return value != null && value.trim().length > 0;
	}

	protected formatQuotedArray(values: Iterable<string>): string {
		return `[${[...values].map((value) => `"${value}"`).join(", ")}]`;
	}

	protected toolCallingOptions(
		context: ChatModelObservationContext,
	): ToolCallingChatOptions | null {
		const options = context.request.options;
		if (
			options == null ||
			!("toolCallbacks" in options) ||
			!("toolNames" in options)
		) {
			return null;
		}
		return options as ToolCallingChatOptions;
	}
}
