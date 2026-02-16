import assert from "node:assert/strict";
import {
	AiObservationAttributes,
	KeyValue,
	KeyValues,
	SpringAiKind,
} from "@nestjs-ai/commons";
import type { ToolCallingChatOptions } from "@nestjs-ai/model";
import type { ChatClientObservationContext } from "./chat-client-observation-context";
import { ChatClientObservationConvention } from "./chat-client-observation-convention";

export class DefaultChatClientObservationConvention extends ChatClientObservationConvention {
	static readonly DEFAULT_NAME = "spring.ai.chat.client";

	private readonly _name: string;

	constructor(
		name: string = DefaultChatClientObservationConvention.DEFAULT_NAME,
	) {
		super();
		this._name = name;
	}

	override getName(): string {
		return this._name;
	}

	override getContextualName(context: ChatClientObservationContext): string {
		assert(context, "context cannot be null");
		return `${context.operationMetadata.provider} ${SpringAiKind.CHAT_CLIENT.value}`;
	}

	override getLowCardinalityKeyValues(
		context: ChatClientObservationContext,
	): KeyValue[] {
		assert(context, "context cannot be null");
		return KeyValues.of(
			this.aiOperationType(context),
			this.aiProvider(context),
			this.springAiKind(),
			this.stream(context),
		).toArray();
	}

	protected aiOperationType(context: ChatClientObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_OPERATION_TYPE.value,
			context.operationMetadata.operationType,
		);
	}

	protected aiProvider(context: ChatClientObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_PROVIDER.value,
			context.operationMetadata.provider,
		);
	}

	protected springAiKind(): KeyValue {
		return KeyValue.of("spring.ai.kind", SpringAiKind.CHAT_CLIENT.value);
	}

	protected stream(context: ChatClientObservationContext): KeyValue {
		return KeyValue.of(
			"spring.ai.chat.client.stream",
			String(context.isStream),
		);
	}

	override getHighCardinalityKeyValues(
		context: ChatClientObservationContext,
	): KeyValue[] {
		assert(context, "context cannot be null");
		let keyValues = KeyValues.empty();
		keyValues = this.advisors(keyValues, context);
		keyValues = this.conversationId(keyValues, context);
		keyValues = this.tools(keyValues, context);
		return keyValues.toArray();
	}

	protected advisors(
		keyValues: KeyValues,
		context: ChatClientObservationContext,
	): KeyValues {
		if (context.advisors.length === 0) {
			return keyValues;
		}
		const advisorNames = context.advisors.map((advisor) => advisor.name);
		return keyValues.and(
			"spring.ai.chat.client.advisors",
			this.formatQuotedArray(advisorNames),
		);
	}

	protected conversationId(
		keyValues: KeyValues,
		context: ChatClientObservationContext,
	): KeyValues {
		if (context.request.context.size === 0) {
			return keyValues;
		}

		const conversationId = context.request.context.get(
			"chat_memory_conversation_id",
		);
		if (!this.hasText(conversationId)) {
			return keyValues;
		}

		return keyValues.and(
			"spring.ai.chat.client.conversation.id",
			conversationId,
		);
	}

	protected tools(
		keyValues: KeyValues,
		context: ChatClientObservationContext,
	): KeyValues {
		const options = this.toolCallingOptions(context);
		if (options == null) {
			return keyValues;
		}

		const toolNames = [...options.toolNames];
		for (const toolCallback of options.toolCallbacks) {
			toolNames.push(toolCallback.toolDefinition.name);
		}

		if (toolNames.length === 0) {
			return keyValues;
		}

		return keyValues.and(
			"spring.ai.chat.client.tool.names",
			this.formatQuotedArray(toolNames.sort()),
		);
	}

	protected hasText(value: unknown): value is string {
		return typeof value === "string" && value.trim().length > 0;
	}

	protected formatQuotedArray(values: Iterable<string>): string {
		return `[${[...values].map((value) => `"${value}"`).join(", ")}]`;
	}

	protected toolCallingOptions(
		context: ChatClientObservationContext,
	): ToolCallingChatOptions | null {
		const options = context.request.prompt.options;
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
