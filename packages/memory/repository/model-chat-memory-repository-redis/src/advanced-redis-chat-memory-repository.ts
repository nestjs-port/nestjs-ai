import type { Message, MessageType } from "@nestjs-ai/model";

export interface AsyncChatMemoryRepository {
  findConversationIds(): Promise<string[]>;

  findByConversationId(conversationId: string): Promise<Message[]>;

  saveAll(conversationId: string, messages: Message[]): Promise<void>;

  deleteByConversationId(conversationId: string): Promise<void>;
}

/**
 * Wrapper type for returning messages with their conversation context.
 */
export interface MessageWithConversation {
  readonly conversationId: string;
  readonly message: Message;
  readonly timestamp: number;
}

/**
 * Redis-specific extension of ChatMemoryRepository with advanced query capabilities.
 */
export interface AdvancedRedisChatMemoryRepository
  extends AsyncChatMemoryRepository {
  findByContent(
    contentPattern: string,
    limit: number,
  ): Promise<MessageWithConversation[]>;

  findByType(
    messageType: MessageType,
    limit: number,
  ): Promise<MessageWithConversation[]>;

  findByTimeRange(
    conversationId: string | null,
    fromTime: Date,
    toTime: Date,
    limit: number,
  ): Promise<MessageWithConversation[]>;

  findByMetadata(
    metadataKey: string,
    metadataValue: unknown,
    limit: number,
  ): Promise<MessageWithConversation[]>;

  executeQuery(
    query: string,
    limit: number,
  ): Promise<MessageWithConversation[]>;
}
