import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import type { Message } from "../messages";

/**
 * The contract for storing and managing the memory of chat conversations.
 */
export abstract class ChatMemory {
  static readonly DEFAULT_CONVERSATION_ID = "default";

  /**
   * The key to retrieve the chat memory conversation id from the context.
   */
  static readonly CONVERSATION_ID = "chat_memory_conversation_id";

  add(conversationId: string, message: Message): void;
  add(conversationId: string, messages: Message[]): void;
  add(conversationId: string, messageOrMessages: Message | Message[]): void {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    assert(messageOrMessages != null, "message cannot be null");

    const messages = Array.isArray(messageOrMessages)
      ? [...messageOrMessages]
      : [messageOrMessages];

    this.addMessages(conversationId, messages);
  }

  /**
   * Save the specified messages in the chat memory for the specified conversation.
   */
  protected abstract addMessages(
    conversationId: string,
    messages: Message[],
  ): void;

  /**
   * Get the messages in the chat memory for the specified conversation.
   */
  abstract get(conversationId: string): Message[];

  /**
   * Clear the chat memory for the specified conversation.
   */
  abstract clear(conversationId: string): void;
}
