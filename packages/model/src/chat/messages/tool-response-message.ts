import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

/**
 * Represents a response from a tool/function call.
 */
export interface ToolResponse {
	readonly id: string;
	readonly name: string;
	readonly responseData: string;
}

/**
 * The ToolResponseMessage class represents a message with function/tool content
 * in a chat application.
 */
export class ToolResponseMessage extends AbstractMessage {
	protected readonly responses: ToolResponse[];

	private constructor(
		responses: ToolResponse[],
		metadata: Record<string, unknown>,
	) {
		super(MessageType.TOOL, "", metadata);
		this.responses = responses;
	}

	/**
	 * Get the tool responses.
	 */
	getResponses(): ToolResponse[] {
		return this.responses;
	}

	/**
	 * Create a new builder for ToolResponseMessage.
	 */
	static builder(): ToolResponseMessageBuilder {
		return new ToolResponseMessageBuilder();
	}

	toString(): string {
		return `ToolResponseMessage{responses=${JSON.stringify(this.responses)}, messageType=${this.messageType}, metadata=${JSON.stringify(this.metadata)}}`;
	}
}

/**
 * Builder for ToolResponseMessage.
 */
export class ToolResponseMessageBuilder {
	private _responses: ToolResponse[] = [];
	private _metadata: Record<string, unknown> = {};

	responses(responses: ToolResponse[]): ToolResponseMessageBuilder {
		this._responses = responses;
		return this;
	}

	metadata(metadata: Record<string, unknown>): ToolResponseMessageBuilder {
		this._metadata = metadata;
		return this;
	}

	build(): ToolResponseMessage {
		return Object.assign(Object.create(ToolResponseMessage.prototype), {
			messageType: MessageType.TOOL,
			textContent: "",
			metadata: {
				...this._metadata,
				[AbstractMessage.MESSAGE_TYPE]: MessageType.TOOL,
			},
			responses: [...this._responses],
		}) as ToolResponseMessage;
	}
}
