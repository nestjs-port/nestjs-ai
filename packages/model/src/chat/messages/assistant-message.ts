import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

/**
 * Represents a tool call made by the assistant.
 */
export interface ToolCall {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly arguments: string;
}

/**
 * Lets the generative know the content was generated as a response to the user.
 * This role indicates messages that the generative has previously generated in the conversation.
 * By including assistant messages in the series, you provide context to the generative
 * about prior exchanges in the conversation.
 */
export class AssistantMessage extends AbstractMessage implements MediaContent {
	private readonly toolCalls: ToolCall[];
	protected readonly media: Media[];

	private constructor(
		content: string | null,
		properties: Record<string, unknown>,
		toolCalls: ToolCall[],
		media: Media[],
	) {
		super(MessageType.ASSISTANT, content, properties);
		if (!toolCalls) {
			throw new Error("Tool calls must not be null");
		}
		if (!media) {
			throw new Error("Media must not be null");
		}
		this.toolCalls = toolCalls;
		this.media = media;
	}

	/**
	 * Create an AssistantMessage with text content.
	 */
	static of(content: string): AssistantMessage {
		return new AssistantMessage(content, {}, [], []);
	}

	/**
	 * Get the tool calls made by the assistant.
	 */
	getToolCalls(): ToolCall[] {
		return this.toolCalls;
	}

	/**
	 * Check if this message has tool calls.
	 */
	hasToolCalls(): boolean {
		return this.toolCalls.length > 0;
	}

	/**
	 * Get the media associated with the message.
	 */
	getMedia(): Media[] {
		return this.media;
	}

	/**
	 * Create a new builder for AssistantMessage.
	 */
	static builder(): AssistantMessageBuilder {
		return new AssistantMessageBuilder();
	}

	toString(): string {
		return `AssistantMessage [messageType=${this.messageType}, toolCalls=${JSON.stringify(this.toolCalls)}, textContent=${this.textContent}, metadata=${JSON.stringify(this.metadata)}]`;
	}
}

/**
 * Builder for AssistantMessage.
 */
export class AssistantMessageBuilder {
	private _content: string | null = null;
	private _properties: Record<string, unknown> = {};
	private _toolCalls: ToolCall[] = [];
	private _media: Media[] = [];

	content(content: string): AssistantMessageBuilder {
		this._content = content;
		return this;
	}

	properties(properties: Record<string, unknown>): AssistantMessageBuilder {
		this._properties = properties;
		return this;
	}

	toolCalls(toolCalls: ToolCall[]): AssistantMessageBuilder {
		this._toolCalls = toolCalls;
		return this;
	}

	media(media: Media[]): AssistantMessageBuilder {
		this._media = media;
		return this;
	}

	build(): AssistantMessage {
		return Object.assign(Object.create(AssistantMessage.prototype), {
			messageType: MessageType.ASSISTANT,
			textContent: this._content,
			metadata: {
				...this._properties,
				[AbstractMessage.MESSAGE_TYPE]: MessageType.ASSISTANT,
			},
			toolCalls: [...this._toolCalls],
			media: [...this._media],
		}) as AssistantMessage;
	}
}
