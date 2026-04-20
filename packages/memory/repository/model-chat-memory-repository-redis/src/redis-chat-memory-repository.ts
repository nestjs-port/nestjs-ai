/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert/strict";
import { Media, type MediaContent } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  MessageType,
  SystemMessage,
  type ToolCall,
  type ToolResponse,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import {
  createClient,
  FT_AGGREGATE_GROUP_BY_REDUCERS,
  FT_AGGREGATE_STEPS,
  type RediSearchSchema,
  type RedisClientType,
  type RedisJSON,
  SCHEMA_FIELD_TYPE,
  type SearchReply,
} from "redis";
import type {
  AdvancedRedisChatMemoryRepository,
  MessageWithConversation,
} from "./advanced-redis-chat-memory-repository";
import {
  type RedisChatMemoryConfig,
  RedisChatMemoryConfigBuilder,
  type RedisChatMemoryMetadataField,
} from "./redis-chat-memory-config";

interface StoredMessageDocument {
  content: string;
  type: string;
  conversation_id: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  toolCalls?: ToolCall[];
  toolResponses?: ToolResponse[];
  media?: StoredMedia[];
}

interface StoredMedia {
  mimeType: string;
  data: unknown;
  id?: string | null;
  name?: string | null;
  dataType?: "base64";
}

export class RedisChatMemoryRepository
  implements AdvancedRedisChatMemoryRepository, ChatMemoryRepository
{
  private readonly logger: Logger = LoggerFactory.getLogger(
    RedisChatMemoryRepository.name,
  );
  private readonly _config: RedisChatMemoryConfig;
  private readonly _client: RedisClientType;

  private constructor(config: RedisChatMemoryConfig) {
    assert(config, "config must not be null");
    this._config = config;
    this._client = config.client;
  }

  static builder(): RedisChatMemoryRepositoryBuilder {
    return new RedisChatMemoryRepositoryBuilder();
  }

  static async create(
    config: RedisChatMemoryConfig,
  ): Promise<RedisChatMemoryRepository> {
    const repository = new RedisChatMemoryRepository(config);

    if (config.isInitializeSchema) {
      await repository.initialize();
    }

    return repository;
  }

  async add(conversationId: string, message: Message): Promise<void>;
  async add(conversationId: string, messages: Message[]): Promise<void>;
  async add(
    conversationId: string,
    messageOrMessages: Message | Message[],
  ): Promise<void> {
    assert(conversationId != null, "conversationId cannot be null");
    assert(messageOrMessages, "message cannot be null");

    if (Array.isArray(messageOrMessages)) {
      if (messageOrMessages.length === 0) {
        return;
      }

      // Get the next available timestamp for the first message.
      let timestamp =
        await this.getNextTimestampForConversation(conversationId);

      // node-redis auto-pipelines commands issued in the same tick, so this
      // Promise.all batch is sent as a Redis pipeline.
      const operations: Promise<unknown>[] = [];
      for (const message of messageOrMessages) {
        assert(message, "message cannot be null");
        const key = this.createKey(conversationId, timestamp);
        const document = this.createMessageDocument(
          conversationId,
          message,
          timestamp,
        );

        if (this.logger.isDebugEnabled()) {
          this.logger.debug(
            `Storing batch message with key: ${key}, type: ${message.messageType}, content: ${message.text}`,
          );
        }

        operations.push(
          this._client.json.set(key, "$", document as unknown as RedisJSON),
        );
        if (this._config.timeToLiveSeconds !== -1) {
          operations.push(
            this._client.expire(key, this._config.timeToLiveSeconds),
          );
        }
        timestamp += 1;
      }
      await Promise.all(operations);
      return;
    }

    await this.addSingle(conversationId, messageOrMessages);
  }

  async get(conversationId: string, lastN?: number): Promise<Message[]> {
    assert(conversationId != null, "conversationId cannot be null");
    const limit = lastN ?? this._config.maxMessagesPerConversation;
    assert(limit > 0, "lastN must be greater than 0");

    // Build a tag field query for conversation_id.
    const query = `@conversation_id:{${escapeTagValue(conversationId)}}`;
    const rawResult = await this._client.ft.search(
      this._config.indexName,
      query,
      {
        RETURN: ["$"],
        SORTBY: { BY: "timestamp", DIRECTION: "ASC" },
        LIMIT: { from: 0, size: limit },
      },
    );
    const result = asSearchReply(rawResult);
    const messages: Message[] = [];
    for (const doc of result.documents) {
      const json = parseSearchDocumentValue(doc.value);
      if (!json) {
        continue;
      }
      const type = asString(json.type);
      if (!isKnownMessageType(type)) {
        this.logger.warn(`Unknown message type: ${String(type)}`);
        continue;
      }
      messages.push(this.convertJsonToMessage(json));
    }
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `Returning ${messages.length} messages for conversation ${conversationId}`,
      );
    }
    return messages;
  }

  async clear(conversationId: string): Promise<void> {
    assert(conversationId != null, "conversationId cannot be null");

    // Build a tag field query for conversation_id.
    const query = `@conversation_id:{${escapeTagValue(conversationId)}}`;
    const rawResult = await this._client.ft.search(
      this._config.indexName,
      query,
    );
    const result = asSearchReply(rawResult);
    const keys = result.documents.map((doc) => doc.id);
    if (keys.length === 0) {
      return;
    }

    // node-redis auto-pipelines commands issued in the same tick, so this
    // Promise.all batch is sent as a Redis pipeline.
    await Promise.all(keys.map((key) => this._client.del(key)));
  }

  async findConversationIds(): Promise<string[]> {
    const aggregateReply = asAggregateReply(
      await this._client.ft.aggregate(this._config.indexName, "*", {
        STEPS: [
          {
            type: FT_AGGREGATE_STEPS.GROUPBY,
            properties: ["@conversation_id"],
            REDUCE: {
              type: FT_AGGREGATE_GROUP_BY_REDUCERS.COUNT,
              AS: "count",
            },
          },
          {
            type: FT_AGGREGATE_STEPS.LIMIT,
            from: 0,
            size: this._config.maxConversationIds,
          },
        ],
      }),
    );
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `Found ${aggregateReply.results.length} conversation ids using Redis aggregation`,
      );
    }
    return aggregateReply.results
      .map((row) =>
        asString((row as unknown as Record<string, unknown>).conversation_id),
      )
      .filter(
        (conversationId): conversationId is string =>
          typeof conversationId === "string" && conversationId.length > 0,
      );
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    // Reuse existing get method with the configured limit
    return this.get(conversationId, this._config.maxMessagesPerConversation);
  }

  async saveAll(conversationId: string, messages: Message[]): Promise<void> {
    // First clear any existing messages for this conversation
    await this.clear(conversationId);

    // Then add all the new messages
    await this.add(conversationId, messages);
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    // Reuse existing clear method.
    await this.clear(conversationId);
  }

  get indexName() {
    return this._config.indexName;
  }

  async findByContent(
    contentPattern: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(contentPattern, "contentPattern cannot be null or empty");
    assert(limit > 0, "limit must be greater than 0");

    // Note: We don't escape the contentPattern here because Redis full-text search
    // should handle the special characters appropriately in text fields
    const query = `@content:${contentPattern}`;
    return this.executeSearch(query, limit);
  }

  async findByType(
    messageType: MessageType,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(messageType, "messageType cannot be null");
    assert(limit > 0, "limit must be greater than 0");

    // Create a text field query by message type.
    const query = `@type:${messageType.toString()}`;
    return this.executeSearch(query, limit);
  }

  async findByTimeRange(
    conversationId: string | null,
    fromTime: Date,
    toTime: Date,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(fromTime, "fromTime cannot be null");
    assert(toTime, "toTime cannot be null");
    assert(limit > 0, "limit must be greater than 0");
    assert(
      toTime.getTime() >= fromTime.getTime(),
      "toTime must be >= fromTime",
    );

    // Build numeric range query for timestamp.
    const range = `@timestamp:[${fromTime.getTime()} ${toTime.getTime()}]`;
    // If conversationId is provided, add it as a tag filter.
    const query =
      conversationId && conversationId.length > 0
        ? `${range} @conversation_id:{${escapeTagValue(conversationId)}}`
        : range;

    return this.executeSearch(query, limit);
  }

  async findByMetadata(
    metadataKey: string,
    metadataValue: unknown,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(metadataKey, "metadataKey cannot be null or empty");
    assert(
      metadataValue !== null && metadataValue !== undefined,
      "metadataValue cannot be null",
    );
    assert(limit > 0, "limit must be greater than 0");

    // Check if this metadata field was explicitly defined in the schema.
    const metadataField = this._config.metadataFields.find(
      (field) => field.name === metadataKey,
    );

    let query: string;
    if (!metadataField) {
      // Field not explicitly indexed. Search in general metadata field.
      const searchPattern = `${metadataKey} ${String(metadataValue)}`;
      query = `@metadata:${searchPattern}`;
    } else if ((metadataField.type ?? "text") === "numeric") {
      // Field is indexed as numeric. Use exact numeric range when possible.
      const numericValue = Number(metadataValue);
      query = Number.isFinite(numericValue)
        ? `@metadata_${metadataKey}:[${numericValue} ${numericValue}]`
        : // Fall back to text search in general metadata.
          `@metadata:${metadataKey} ${String(metadataValue)}`;
    } else if ((metadataField.type ?? "text") === "tag") {
      // For tag fields, use tag query without escaping to mirror Java behavior.
      query = `@metadata_${metadataKey}:{${String(metadataValue)}}`;
    } else {
      // Default text metadata query.
      query = `@metadata_${metadataKey}:${escapeTextValue(String(metadataValue))}`;
    }

    return this.executeSearch(query, limit);
  }

  async executeQuery(
    query: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(query, "query cannot be null or empty");
    assert(limit > 0, "limit must be greater than 0");
    // The caller provides full RediSearch query syntax.
    return this.executeSearch(query, limit);
  }

  private async initialize(): Promise<void> {
    if (!this._client.isOpen) {
      await this._client.connect();
    }

    if (!this._config.isInitializeSchema) {
      return;
    }

    await this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      const existingIndexes = new Set(await this._client.ft._list());
      if (existingIndexes.has(this._config.indexName)) {
        if (this.logger.isDebugEnabled()) {
          this.logger.debug(
            `Redis search index '${this._config.indexName}' already exists`,
          );
        }
        return;
      }

      // Create the index with the defined schema.
      const schema: RediSearchSchema = this.createSchema();

      const response = await this._client.ft.create(
        this._config.indexName,
        schema,
        {
          ON: "JSON",
          PREFIX: this._config.keyPrefix,
        },
      );

      if (response !== "OK") {
        throw new Error(`Failed to create index: ${String(response)}`);
      }

      if (this.logger.isDebugEnabled()) {
        this.logger.debug(
          `Created Redis search index '${this._config.indexName}' with ${Object.keys(schema).length} schema fields`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to initialize Redis schema", error);
      throw new Error("Could not initialize Redis schema", {
        cause: error,
      });
    }
  }

  private createSchema(): RediSearchSchema {
    // Basic fields for all messages.
    const schema: RediSearchSchema = {
      "$.content": { type: SCHEMA_FIELD_TYPE.TEXT, AS: "content" },
      "$.type": { type: SCHEMA_FIELD_TYPE.TEXT, AS: "type" },
      "$.conversation_id": {
        type: SCHEMA_FIELD_TYPE.TAG,
        AS: "conversation_id",
      },
      "$.timestamp": { type: SCHEMA_FIELD_TYPE.NUMERIC, AS: "timestamp" },
    };

    if (this._config.metadataFields.length > 0) {
      // User has provided a metadata schema. Use it.
      for (const field of this._config.metadataFields) {
        const jsonPath = `$.metadata.${field.name}`;
        const indexedName = `metadata_${field.name}`;

        // Use field type-specific indexing for metadata.
        switch ((field.type ?? "text").toLowerCase()) {
          case "numeric":
            schema[jsonPath] = {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: indexedName,
            };
            break;
          case "tag":
            schema[jsonPath] = {
              type: SCHEMA_FIELD_TYPE.TAG,
              AS: indexedName,
            };
            break;
          default:
            schema[jsonPath] = {
              type: SCHEMA_FIELD_TYPE.TEXT,
              AS: indexedName,
            };
            break;
        }
      }
      // When specific metadata fields are defined, do not add wildcard metadata
      // indexing to avoid non-string indexing issues.
    } else {
      // No schema provided. Fallback to indexing all metadata as text.
      schema["$.metadata.*"] = {
        type: SCHEMA_FIELD_TYPE.TEXT,
        AS: "metadata",
      };
    }

    return schema;
  }

  private async getNextTimestampForConversation(
    conversationId: string,
  ): Promise<number> {
    // Create a Redis key specifically for tracking the sequence.
    const sequenceKey = `${this._config.keyPrefix}counter:${escapeKey(conversationId)}`;

    try {
      // Get the current time as base timestamp.
      const baseTimestamp = Date.now();
      // Use a Lua script for atomic operation so concurrent writers always get
      // unique and increasing timestamps.
      const script =
        "local exists = redis.call('EXISTS', KEYS[1]) " +
        "if exists == 0 then " +
        "  redis.call('SET', KEYS[1], ARGV[1]) " +
        "  return ARGV[1] " +
        "end " +
        "return redis.call('INCR', KEYS[1])";

      // Execute the script atomically.
      const result = await this._client.eval(script, {
        keys: [sequenceKey],
        arguments: [`${baseTimestamp}`],
      });

      const nextTimestamp = Number(
        typeof result === "number" ? result : String(result),
      );

      // Set expiration on the counter key (same as the messages).
      if (this._config.timeToLiveSeconds !== -1) {
        await this._client.expire(sequenceKey, this._config.timeToLiveSeconds);
      }

      if (this.logger.isDebugEnabled()) {
        this.logger.debug(
          `Generated atomic timestamp ${nextTimestamp} for conversation ${conversationId}`,
        );
      }

      return nextTimestamp;
    } catch (error) {
      // Fall back to high-resolution timestamp for uniqueness.
      this.logger.warn(
        `Error getting atomic timestamp for conversation ${conversationId}, using fallback`,
        error,
      );
      // Add nanoseconds to ensure uniqueness even in fallback scenario
      return Date.now() * 1000 + Number(process.hrtime.bigint() % 1000n);
    }
  }

  private createKey(conversationId: string, timestamp: number): string {
    return `${this._config.keyPrefix}${escapeKey(conversationId)}:${timestamp}`;
  }

  private async addSingle(
    conversationId: string,
    message: Message,
    timestamp?: number,
  ): Promise<void> {
    // Get the next available timestamp for this conversation when not provided.
    const resolvedTimestamp =
      timestamp ?? (await this.getNextTimestampForConversation(conversationId));
    const key = this.createKey(conversationId, resolvedTimestamp);
    const document = this.createMessageDocument(
      conversationId,
      message,
      resolvedTimestamp,
    );

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(
        `Storing message with key: ${key}, type: ${message.messageType}, content: ${message.text}`,
      );
    }

    await this._client.json.set(key, "$", document as unknown as RedisJSON);

    if (this._config.timeToLiveSeconds !== -1) {
      await this._client.expire(key, this._config.timeToLiveSeconds);
    }
  }

  private createMessageDocument(
    conversationId: string,
    message: Message,
    timestamp: number,
  ): StoredMessageDocument {
    const document: StoredMessageDocument = {
      type: message.messageType.toString(),
      content: message.text ?? "",
      conversation_id: conversationId,
      timestamp,
    };

    // Store metadata/properties.
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      const copiedMetadata = { ...message.metadata };
      if ("messageType" in copiedMetadata) {
        copiedMetadata.messageType = String(copiedMetadata.messageType);
      }
      document.metadata = copiedMetadata;
    }

    // Handle tool calls for AssistantMessage.
    if (message instanceof AssistantMessage && message.toolCalls.length > 0) {
      document.toolCalls = [...message.toolCalls];
    }

    // Handle tool responses for ToolResponseMessage.
    if (message instanceof ToolResponseMessage) {
      document.toolResponses = [...message.responses];
    }

    // Handle media content.
    if (
      RedisChatMemoryRepository.isMediaContent(message) &&
      message.media.length > 0
    ) {
      const mediaList: StoredMedia[] = [];

      for (const mediaItem of message.media) {
        const mediaMap: StoredMedia = {
          mimeType: mediaItem.mimeType,
          data: "",
        };

        // Store ID and name if present.
        if (mediaItem.id != null) {
          mediaMap.id = mediaItem.id;
        }
        if (mediaItem.name != null) {
          mediaMap.name = mediaItem.name;
        }

        // Handle data based on its type.
        const data = mediaItem.data;
        if (data != null) {
          if (data instanceof URL || typeof data === "string") {
            // Store URI/URL as string
            mediaMap.data = data.toString();
          } else if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
            // Encode byte array as Base64 string
            mediaMap.data = Buffer.from(data).toString("base64");
            // Add a marker to indicate this is Base64-encoded
            mediaMap.dataType = "base64";
          } else {
            // For other types, store as string
            mediaMap.data = String(data);
          }
        }

        mediaList.push(mediaMap);
      }

      document.media = mediaList;
    }

    return document;
  }

  private static isMediaContent(message: unknown): message is MediaContent {
    const candidate = message as { media?: unknown };
    return Array.isArray(candidate.media);
  }

  private async executeSearch(
    query: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    try {
      const rawResult = await this._client.ft.search(
        this._config.indexName,
        query,
        {
          RETURN: ["$"],
          SORTBY: { BY: "timestamp", DIRECTION: "ASC" },
          LIMIT: { from: 0, size: limit },
        },
      );
      const result = asSearchReply(rawResult);

      const processed = this.processSearchResult(result);
      if (this.logger.isDebugEnabled()) {
        this.logger.debug(
          `Executed query '${query}' with limit ${limit}, returned ${processed.length} results`,
        );
      }
      return processed;
    } catch (error) {
      this.logger.error(`Error executing query '${query}'`, error);
      return [];
    }
  }

  private processSearchResult(result: SearchReply): MessageWithConversation[] {
    const messages: MessageWithConversation[] = [];

    for (const doc of result.documents) {
      // Parse the JSON document payload.
      const json = parseSearchDocumentValue(doc.value);
      if (!json) {
        continue;
      }

      // Extract conversation ID and timestamp.
      const conversationId = asString(json.conversation_id);
      const timestamp = asNumber(json.timestamp);
      if (!conversationId) {
        continue;
      }

      // Convert JSON to message and collect result entry.
      messages.push({
        conversationId,
        timestamp,
        message: this.convertJsonToMessage(json),
      });
    }

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(`Search returned ${messages.length} messages`);
    }

    return messages;
  }

  /**
   * Converts a JSON object to a Message instance. This is a helper method for the
   * advanced query operations to convert Redis JSON documents back to Message objects.
   * @param doc The JSON object representing a message
   * @return A Message object of the appropriate type
   */
  private convertJsonToMessage(doc: Record<string, unknown>): Message {
    const type = asString(doc.type);
    const content = asString(doc.content);
    // Convert metadata payload to object map if present.
    const metadata = normalizeObject(doc.metadata);

    if (type === MessageType.ASSISTANT.toString()) {
      // Handle tool calls and media for AssistantMessage.
      return new AssistantMessage({
        content,
        properties: metadata,
        toolCalls: parseToolCalls(doc.toolCalls),
        media: parseMedia(doc.media),
      });
    }

    if (type === MessageType.USER.toString()) {
      // Create UserMessage with metadata and media.
      return new UserMessage({
        content: content ?? "",
        properties: metadata,
        media: parseMedia(doc.media),
      });
    }

    if (type === MessageType.SYSTEM.toString()) {
      return new SystemMessage({
        content: content ?? "",
        properties: metadata,
      });
    }

    if (type === MessageType.TOOL.toString()) {
      // Extract tool responses for ToolResponseMessage.
      return new ToolResponseMessage({
        properties: metadata,
        responses: parseToolResponses(doc.toolResponses),
      });
    }

    // For unknown message types, return a generic UserMessage.
    this.logger.warn(`Unknown message type: ${type}`);
    return new UserMessage({
      content: content ?? "",
      properties: metadata,
    });
  }
}

export class RedisChatMemoryRepositoryBuilder {
  private readonly _configBuilder = new RedisChatMemoryConfigBuilder();
  private _redisUrl: string | null = null;
  private _client: RedisClientType | null = null;

  redisUrl(redisUrl: string): this {
    this._redisUrl = redisUrl;
    return this;
  }

  client(redisClient: RedisClientType): this {
    this._client = redisClient;
    this._configBuilder.redisClient(redisClient);
    return this;
  }

  indexName(indexName: string): this {
    this._configBuilder.indexName(indexName);
    return this;
  }

  keyPrefix(keyPrefix: string): this {
    this._configBuilder.keyPrefix(keyPrefix);
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._configBuilder.initializeSchema(initializeSchema);
    return this;
  }

  ttlSeconds(timeToLiveSeconds: number): this {
    this._configBuilder.timeToLive(timeToLiveSeconds);
    return this;
  }

  maxConversationIds(maxConversationIds: number): this {
    this._configBuilder.maxConversationIds(maxConversationIds);
    return this;
  }

  maxMessagesPerConversation(maxMessagesPerConversation: number): this {
    this._configBuilder.maxMessagesPerConversation(maxMessagesPerConversation);
    return this;
  }

  metadataFields(metadataFields: RedisChatMemoryMetadataField[]): this {
    this._configBuilder.metadataFields(metadataFields);
    return this;
  }

  async build(): Promise<RedisChatMemoryRepository> {
    if (!this._client) {
      const client = createClient(
        this._redisUrl ? { url: this._redisUrl } : undefined,
      ) as RedisClientType;
      client.on("error", () => {
        // No-op to avoid unhandled "error" event crashes when caller does not attach listeners.
      });
      this._client = client;
      this._configBuilder.redisClient(client);
    }

    const config = this._configBuilder.build();
    return RedisChatMemoryRepository.create(config);
  }
}

function parseSearchDocumentValue(
  value: Record<string, unknown>,
): Record<string, unknown> | null {
  const root = value.$;
  if (typeof root === "string") {
    try {
      return JSON.parse(root) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (Array.isArray(root) && root.length > 0 && typeof root[0] === "string") {
    try {
      return JSON.parse(root[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (root && typeof root === "object") {
    return root as Record<string, unknown>;
  }

  // node-redis v5 already unwraps the $ path, so value is the document itself
  if (value.$ === undefined && Object.keys(value).length > 0) {
    return value;
  }

  return null;
}

function parseToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      id: asString(item.id) ?? "",
      type: asString(item.type) ?? "",
      name: asString(item.name) ?? "",
      arguments: asString(item.arguments) ?? "",
    }));
}

function parseToolResponses(value: unknown): ToolResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      id: asString(item.id) ?? "",
      name: asString(item.name) ?? "",
      responseData: asString(item.responseData) ?? "",
    }));
}

function isKnownMessageType(value: string | null): value is string {
  return (
    value === MessageType.ASSISTANT.toString() ||
    value === MessageType.USER.toString() ||
    value === MessageType.SYSTEM.toString() ||
    value === MessageType.TOOL.toString()
  );
}

function parseMedia(value: unknown): Media[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const media: Media[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const raw = item as Record<string, unknown>;
    // Extract required media properties.
    const mimeType = asString(raw.mimeType);
    if (!mimeType) {
      continue;
    }

    // Handle data based on its type marker.
    const dataType = asString(raw.dataType);
    let data: unknown = raw.data;
    if (dataType === "base64" && typeof raw.data === "string") {
      try {
        // Decode Base64 string to bytes.
        data = Buffer.from(raw.data, "base64");
      } catch {
        // Preserve original data when Base64 decode fails.
        data = raw.data;
      }
    }

    media.push(
      new Media({
        mimeType,
        data,
        id: asString(raw.id),
        name: asString(raw.name),
      }),
    );
  }

  return media;
}

function escapeKey(value: string): string {
  return value.replaceAll(":", "\\:");
}

function escapeTagValue(value: string): string {
  return value.replaceAll(/([,.<>{}[\]"':;!@#$%^&*()\-+=~/\\| ])/g, "\\$1");
}

function escapeTextValue(value: string): string {
  return value.replaceAll(/([,.<>{}[\]"':;!@#$%^&*()\-+=~/\\| ])/g, "\\$1");
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(source)) {
    if (fieldValue !== undefined) {
      out[key] = normalizeValue(fieldValue);
    }
  }
  return out;
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof MessageType) {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (fieldValue !== undefined) {
        out[key] = normalizeValue(fieldValue);
      }
    }
    return out;
  }

  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function asSearchReply(value: unknown): SearchReply {
  if (
    value &&
    typeof value === "object" &&
    "documents" in value &&
    Array.isArray((value as Record<string, unknown>).documents)
  ) {
    return value as SearchReply;
  }

  return {
    total: 0,
    documents: [],
  };
}

function asAggregateReply(value: unknown): {
  total: number;
  results: Record<string, unknown>[];
} {
  if (
    value &&
    typeof value === "object" &&
    "total" in value &&
    "results" in value &&
    Array.isArray((value as Record<string, unknown>).results)
  ) {
    return value as { total: number; results: Record<string, unknown>[] };
  }

  return {
    total: 0,
    results: [],
  };
}
