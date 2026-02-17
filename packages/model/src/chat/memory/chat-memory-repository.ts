import type { Message } from "../messages";

/**
 * A repository for storing and retrieving chat messages.
 */
export interface ChatMemoryRepository {
  findConversationIds(): string[];

  findByConversationId(conversationId: string): Message[];

  /**
   * Replaces all the existing messages for the given conversation ID with the provided messages.
   */
  saveAll(conversationId: string, messages: Message[]): void;

  deleteByConversationId(conversationId: string): void;
}
