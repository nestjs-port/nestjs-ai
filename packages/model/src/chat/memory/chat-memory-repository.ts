import type { Message } from "../messages";

/**
 * A repository for storing and retrieving chat messages.
 */
export interface ChatMemoryRepository {
  findConversationIds(): Promise<string[]>;

  findByConversationId(conversationId: string): Promise<Message[]>;

  /**
   * Replaces all the existing messages for the given conversation ID with the provided messages.
   */
  saveAll(conversationId: string, messages: Message[]): Promise<void>;

  deleteByConversationId(conversationId: string): Promise<void>;
}
