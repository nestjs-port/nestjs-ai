import assert from "node:assert/strict";
import type { Message } from "./message.interface";
import { MessageType } from "./message-type";

/**
 * The AbstractMessage class is an abstract implementation of the {@link Message} interface.
 * It provides a base implementation for message content, media attachments, metadata,
 * and message type.
 *
 * @see Message
 */
export abstract class AbstractMessage implements Message {
  /**
   * The key for the message type in the metadata.
   */
  static readonly MESSAGE_TYPE = "messageType";

  /**
   * The message type of the message.
   */
  protected readonly _messageType: MessageType;

  /**
   * The content of the message.
   */
  protected readonly _textContent: string | null;

  /**
   * Additional options for the message to influence the response.
   */
  protected readonly _metadata: Record<string, unknown>;

  /**
   * Create a new AbstractMessage with the given message type, text content, and metadata.
   * @param messageType the message type
   * @param textContent the text content
   * @param metadata the metadata
   */
  protected constructor(
    messageType: MessageType,
    textContent: string | null,
    metadata: Record<string, unknown>,
  ) {
    assert(messageType, "Message type must not be null");
    if (
      messageType === MessageType.SYSTEM ||
      messageType === MessageType.USER
    ) {
      assert(
        typeof textContent === "string",
        "Content must not be null for SYSTEM or USER messages",
      );
    }
    assert(metadata, "Metadata must not be null");

    this._messageType = messageType;
    this._textContent = textContent;
    this._metadata = {
      ...metadata,
      [AbstractMessage.MESSAGE_TYPE]: messageType,
    };
  }

  /**
   * Get the content of the message.
   * @returns the content of the message
   */
  get text(): string | null {
    return this._textContent;
  }

  /**
   * Get the metadata of the message.
   * @returns the metadata of the message
   */
  get metadata(): Record<string, unknown> {
    return this._metadata;
  }

  /**
   * Get the message type of the message.
   * @returns the message type of the message
   */
  get messageType(): MessageType {
    return this._messageType;
  }
}
