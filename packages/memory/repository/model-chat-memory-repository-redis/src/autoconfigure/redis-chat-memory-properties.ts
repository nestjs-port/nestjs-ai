import type { RedisClientOptions, RedisClientType } from "redis";

import type { RedisChatMemoryMetadataField } from "../redis-chat-memory-config";

export interface RedisChatMemoryProperties {
  client?: RedisClientType;
  clientOptions?: RedisClientOptions;
  indexName?: string;
  keyPrefix?: string;
  timeToLive?: number | null;
  initializeSchema?: boolean;
  maxConversationIds?: number;
  maxMessagesPerConversation?: number;
  metadataFields?: RedisChatMemoryMetadataField[];
}
