import type { Content } from "@nestjs-ai/commons";
import type { MessageType } from "./message-type";

/**
 * The Message interface represents a message that can be sent or received in a chat
 * application. Messages can have content, media attachments, properties, and message
 * types.
 */
export interface Message extends Content {
  /**
   * Get the message type.
   * @returns the message type
   */
  get messageType(): MessageType;
}
