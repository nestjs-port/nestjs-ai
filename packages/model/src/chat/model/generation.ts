import assert from "node:assert/strict";
import type { ModelResult } from "../../model";
import type { AssistantMessage } from "../messages";
import { ChatGenerationMetadata } from "../metadata";

/**
 * Properties for creating a Generation instance.
 */
export interface GenerationProps {
	assistantMessage: AssistantMessage;
	chatGenerationMetadata?: ChatGenerationMetadata;
}

/**
 * Represents a single generation result from the AI model.
 * Implements ModelResult with AssistantMessage as the output type.
 */
export class Generation implements ModelResult<AssistantMessage> {
	private readonly _assistantMessage: AssistantMessage;
	private readonly _chatGenerationMetadata: ChatGenerationMetadata;

	constructor(props: GenerationProps) {
		assert(props.assistantMessage, "AssistantMessage must not be null");
		this._assistantMessage = props.assistantMessage;
		this._chatGenerationMetadata =
			props.chatGenerationMetadata ?? ChatGenerationMetadata.NULL;
	}

	/**
	 * Get the output of this generation (ModelResult interface).
	 */
	get output(): AssistantMessage {
		return this._assistantMessage;
	}

	/**
	 * Get the metadata associated with this generation (ModelResult interface).
	 */
	get metadata(): ChatGenerationMetadata {
		return this._chatGenerationMetadata;
	}

	/**
	 * Get the assistant message (convenience alias).
	 */
	get assistantMessage(): AssistantMessage {
		return this._assistantMessage;
	}

	/**
	 * Create a new GenerationBuilder.
	 */
	static builder(): GenerationBuilder {
		return new GenerationBuilder();
	}
}

/**
 * Builder for creating Generation instances.
 */
export class GenerationBuilder {
	private _assistantMessage: AssistantMessage | null = null;
	private _metadata: ChatGenerationMetadata = ChatGenerationMetadata.NULL;

	/**
	 * Set the assistant message.
	 */
	assistantMessage(message: AssistantMessage): this {
		this._assistantMessage = message;
		return this;
	}

	/**
	 * Set the generation metadata.
	 */
	chatGenerationMetadata(metadata: ChatGenerationMetadata): this {
		this._metadata = metadata;
		return this;
	}

	/**
	 * Build the Generation instance.
	 */
	build(): Generation {
		assert(this._assistantMessage, "AssistantMessage must not be null");
		return new Generation({
			assistantMessage: this._assistantMessage,
			chatGenerationMetadata: this._metadata,
		});
	}
}
