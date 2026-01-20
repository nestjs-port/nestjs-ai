import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

/**
 * A message of the type 'system' passed as input.
 * The system message gives high level instructions for the conversation.
 * This role typically provides high-level instructions for the conversation.
 * For example, you might use a system message to instruct the generative
 * to behave like a certain character or to provide answers in a specific format.
 */
export class SystemMessage extends AbstractMessage {
	private constructor(
		textContent: string | null,
		metadata: Record<string, unknown>,
	) {
		super(MessageType.SYSTEM, textContent, metadata);
	}

	/**
	 * Create a SystemMessage with text content.
	 */
	static of(textContent: string): SystemMessage {
		return new SystemMessage(textContent, {});
	}

	/**
	 * Create a copy of this message.
	 */
	copy(): SystemMessage {
		return Object.assign(Object.create(SystemMessage.prototype), {
			messageType: MessageType.SYSTEM,
			textContent: this.getText(),
			metadata: {
				...this.getMetadata(),
				[AbstractMessage.MESSAGE_TYPE]: MessageType.SYSTEM,
			},
		}) as SystemMessage;
	}

	/**
	 * Create a builder to mutate this message.
	 */
	mutate(): SystemMessageBuilder {
		const builder = SystemMessage.builder().metadata(this.getMetadata());

		if (this.textContent !== null) {
			builder.text(this.textContent);
		}

		return builder;
	}

	/**
	 * Create a new builder for SystemMessage.
	 */
	static builder(): SystemMessageBuilder {
		return new SystemMessageBuilder();
	}

	toString(): string {
		return `SystemMessage{textContent='${this.textContent}', messageType=${this.messageType}, metadata=${JSON.stringify(this.metadata)}}`;
	}
}

/**
 * Builder for SystemMessage.
 */
export class SystemMessageBuilder {
	private _textContent: string | null = null;
	private _metadata: Record<string, unknown> = {};

	text(textContent: string): SystemMessageBuilder {
		this._textContent = textContent;
		return this;
	}

	metadata(metadata: Record<string, unknown>): SystemMessageBuilder {
		this._metadata = metadata;
		return this;
	}

	build(): SystemMessage {
		return Object.assign(Object.create(SystemMessage.prototype), {
			messageType: MessageType.SYSTEM,
			textContent: this._textContent,
			metadata: {
				...this._metadata,
				[AbstractMessage.MESSAGE_TYPE]: MessageType.SYSTEM,
			},
		}) as SystemMessage;
	}
}
