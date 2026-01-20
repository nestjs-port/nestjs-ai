import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

/**
 * A message of the type 'user' passed as input.
 * Messages with the user role are from the end-user or developer.
 * They represent questions, prompts, or any input that you want
 * the generative to respond to.
 */
export class UserMessage extends AbstractMessage implements MediaContent {
	protected readonly media: Media[];

	private constructor(
		textContent: string | null,
		media: Media[],
		metadata: Record<string, unknown>,
	) {
		super(MessageType.USER, textContent, metadata);
		if (!media) {
			throw new Error("media cannot be null");
		}
		this.media = [...media];
	}

	/**
	 * Create a UserMessage with text content.
	 */
	static of(textContent: string): UserMessage {
		return new UserMessage(textContent, [], {});
	}

	/**
	 * Get the media associated with the message.
	 */
	getMedia(): Media[] {
		return this.media;
	}

	/**
	 * Create a copy of this message.
	 */
	copy(): UserMessage {
		return this.mutate().build();
	}

	/**
	 * Create a builder to mutate this message.
	 */
	mutate(): UserMessageBuilder {
		const builder = UserMessage.builder()
			.media([...this.getMedia()])
			.metadata({ ...this.getMetadata() });

		if (this.textContent !== null) {
			builder.text(this.textContent);
		}

		return builder;
	}

	/**
	 * Create a new builder for UserMessage.
	 */
	static builder(): UserMessageBuilder {
		return new UserMessageBuilder();
	}

	toString(): string {
		return `UserMessage{content='${this.getText()}', metadata=${JSON.stringify(this.metadata)}, messageType=${this.messageType}}`;
	}
}

/**
 * Builder for UserMessage.
 */
export class UserMessageBuilder {
	private _textContent: string | null = null;
	private _media: Media[] = [];
	private _metadata: Record<string, unknown> = {};

	text(textContent: string): UserMessageBuilder {
		this._textContent = textContent;
		return this;
	}

	media(media: Media[]): UserMessageBuilder {
		this._media = media;
		return this;
	}

	metadata(metadata: Record<string, unknown>): UserMessageBuilder {
		this._metadata = metadata;
		return this;
	}

	build(): UserMessage {
		// Use reflection to access private constructor
		return Object.assign(Object.create(UserMessage.prototype), {
			messageType: MessageType.USER,
			textContent: this._textContent,
			metadata: {
				...this._metadata,
				[AbstractMessage.MESSAGE_TYPE]: MessageType.USER,
			},
			media: [...this._media],
		}) as UserMessage;
	}
}
