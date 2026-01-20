import type { Message } from "./message.interface";
import { MessageType } from "./message-type";

/**
 * The AbstractMessage class is an abstract implementation of the Message interface.
 * It provides a base implementation for message content, media attachments, metadata,
 * and message type.
 */
export abstract class AbstractMessage implements Message {
	/**
	 * The key for the message type in the metadata.
	 */
	static readonly MESSAGE_TYPE = "messageType";

	/**
	 * The message type of the message.
	 */
	protected readonly messageType: MessageType;

	/**
	 * The content of the message.
	 */
	protected readonly textContent: string | null;

	/**
	 * Additional options for the message to influence the response.
	 */
	protected readonly metadata: Record<string, unknown>;

	/**
	 * Create a new AbstractMessage with the given message type, text content, and metadata.
	 */
	protected constructor(
		messageType: MessageType,
		textContent: string | null,
		metadata: Record<string, unknown>,
	) {
		if (!messageType) {
			throw new Error("Message type must not be null");
		}
		if (
			(messageType === MessageType.SYSTEM ||
				messageType === MessageType.USER) &&
			textContent === null
		) {
			throw new Error("Content must not be null for SYSTEM or USER messages");
		}
		if (!metadata) {
			throw new Error("Metadata must not be null");
		}

		this.messageType = messageType;
		this.textContent = textContent;
		this.metadata = {
			...metadata,
			[AbstractMessage.MESSAGE_TYPE]: messageType,
		};
	}

	/**
	 * Get the content of the message.
	 */
	getText(): string | null {
		return this.textContent;
	}

	/**
	 * Get the metadata of the message.
	 */
	getMetadata(): Record<string, unknown> {
		return this.metadata;
	}

	/**
	 * Get the message type of the message.
	 */
	getMessageType(): MessageType {
		return this.messageType;
	}
}
