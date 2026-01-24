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

export interface AssistantMessageProps {
	content?: string | null;
	properties?: Record<string, unknown>;
	toolCalls?: ToolCall[];
	media?: Media[];
}

/**
 * Lets the generative know the content was generated as a response to the user.
 * This role indicates messages that the generative has previously generated in the conversation.
 * By including assistant messages in the series, you provide context to the generative
 * about prior exchanges in the conversation.
 */
export class AssistantMessage extends AbstractMessage implements MediaContent {
	private readonly _toolCalls: ToolCall[];
	protected readonly _media: Media[];

	constructor(props: AssistantMessageProps = {}) {
		super(MessageType.ASSISTANT, props.content ?? null, props.properties ?? {});

		this._toolCalls = props.toolCalls ?? [];
		this._media = props.media ?? [];
	}

	/**
	 * Create an AssistantMessage with text content.
	 */
	static of(content: string): AssistantMessage {
		return new AssistantMessage({ content });
	}

	/**
	 * Get the tool calls made by the assistant.
	 */
	get toolCalls(): ToolCall[] {
		return this._toolCalls;
	}

	/**
	 * Check if this message has tool calls.
	 */
	hasToolCalls(): boolean {
		return this._toolCalls.length > 0;
	}

	/**
	 * Get the media associated with the message.
	 */
	get media(): Media[] {
		return this._media;
	}

	[Symbol.toPrimitive](): string {
		return `AssistantMessage [messageType=${this.messageType}, toolCalls=${JSON.stringify(this.toolCalls)}, textContent=${this.text}, metadata=${JSON.stringify(this.metadata)}]`;
	}
}
