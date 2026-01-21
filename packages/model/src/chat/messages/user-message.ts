import assert from "node:assert/strict";
import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

export interface UserMessageProps {
	content?: string | null;
	properties?: Record<string, unknown>;
	media?: Media[];
}

/**
 * A message of the type 'user' passed as input.
 * Messages with the user role are from the end-user or developer.
 * They represent questions, prompts, or any input that you want
 * the generative to respond to.
 */
export class UserMessage extends AbstractMessage implements MediaContent {
	protected readonly _media: Media[];

	constructor(options: UserMessageProps = {}) {
		super(MessageType.USER, options.content ?? null, options.properties ?? {});
		const media = options.media ?? [];
		assert(media !== undefined, "Media must not be undefined");
		this._media = [...media];
	}

	/**
	 * Create a UserMessage with text content.
	 */
	static of(textContent: string): UserMessage {
		return new UserMessage({ content: textContent, media: [] });
	}

	/**
	 * Get the media associated with the message.
	 */
	get media(): Media[] {
		return this._media;
	}

	/**
	 * Create a copy of this message.
	 */
	copy(): UserMessage {
		return new UserMessage({
			content: this.text,
			properties: { ...this.metadata },
			media: [...this._media],
		});
	}

	[Symbol.toPrimitive](): string {
		return `UserMessage{content='${this.text}', metadata=${JSON.stringify(this.metadata)}, messageType=${this.messageType}}`;
	}
}
