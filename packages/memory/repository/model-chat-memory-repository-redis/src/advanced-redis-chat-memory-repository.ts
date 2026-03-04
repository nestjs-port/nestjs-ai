import type {
  ChatMemoryRepository,
  Message,
  MessageType,
} from "@nestjs-ai/model";

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
  extends ChatMemoryRepository {
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
