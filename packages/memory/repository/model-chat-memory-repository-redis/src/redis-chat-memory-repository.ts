import assert from "node:assert/strict";
import { Media } from "@nestjs-ai/commons";
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
import type { RedisJSON } from "@redis/json";
import type { RediSearchSchema, SearchReply } from "@redis/search";
import { createClient, SCHEMA_FIELD_TYPE } from "redis";
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
  metadata: Record<string, unknown>;
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
  private readonly _config: RedisChatMemoryConfig;
  private readonly _client: ReturnType<typeof createClient>;

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
    await repository.initialize();
    return repository;
  }

  async findConversationIds(): Promise<string[]> {
    const rawResult = await this._client.ft.search(
      this._config.indexName,
      "*",
      {
        RETURN: ["conversation_id"],
        SORTBY: { BY: "timestamp", DIRECTION: "DESC" },
        LIMIT: { from: 0, size: 5000 },
      },
    );
    const result = asSearchReply(rawResult);

    const ids = new Set<string>();
    for (const document of result.documents) {
      const raw = (document.value as Record<string, unknown>).conversation_id;
      if (typeof raw === "string" && raw.length > 0) {
        ids.add(raw);
      }
      if (ids.size >= this._config.maxConversationIds) {
        break;
      }
    }

    return [...ids];
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    assert(conversationId, "conversationId cannot be null or empty");

    const query = `@conversation_id:{${escapeTagValue(conversationId)}}`;
    const result = await this.executeSearch(
      query,
      this._config.maxMessagesPerConversation,
    );

    return result.map((entry) => entry.message);
  }

  async saveAll(conversationId: string, messages: Message[]): Promise<void> {
    assert(conversationId, "conversationId cannot be null or empty");
    assert(messages, "messages cannot be null");

    await this.deleteByConversationId(conversationId);

    for (const message of messages) {
      await this.add(conversationId, message);
    }
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    assert(conversationId, "conversationId cannot be null or empty");

    const query = `@conversation_id:{${escapeTagValue(conversationId)}}`;
    const keys = await this.findKeysForQuery(query, 5000);
    if (keys.length === 0) {
      return;
    }

    const multi = this._client.multi();
    for (const key of keys) {
      multi.del(key);
    }
    await multi.exec();
  }

  async add(conversationId: string, message: Message): Promise<void> {
    assert(conversationId, "conversationId cannot be null or empty");
    assert(message, "message cannot be null");

    const timestamp =
      await this.getNextTimestampForConversation(conversationId);
    const key = this.createKey(conversationId, timestamp);
    const document = this.createMessageDocument(
      conversationId,
      message,
      timestamp,
    );

    await this._client.json.set(key, "$", toRedisJson(document));
    await this.applyTtl(key);
  }

  async addAll(conversationId: string, messages: Message[]): Promise<void> {
    assert(conversationId, "conversationId cannot be null or empty");
    assert(messages, "messages cannot be null");

    for (const message of messages) {
      await this.add(conversationId, message);
    }
  }

  async findByContent(
    contentPattern: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(contentPattern, "contentPattern cannot be null or empty");
    assert(limit > 0, "limit must be greater than 0");

    const query = `@content:${escapeTextQuery(contentPattern)}`;
    return this.executeSearch(query, limit);
  }

  async findByType(
    messageType: MessageType,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(messageType, "messageType cannot be null");
    assert(limit > 0, "limit must be greater than 0");

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

    const range = `@timestamp:[${fromTime.getTime()} ${toTime.getTime()}]`;
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

    const metadataField = this._config.metadataFields.find(
      (field) => field.name === metadataKey,
    );

    let query: string;
    if (!metadataField) {
      const searchPattern = `${metadataKey} ${String(metadataValue)}`;
      query = `@metadata:${escapeTextQuery(searchPattern)}`;
    } else if ((metadataField.type ?? "text") === "numeric") {
      const numericValue = Number(metadataValue);
      query = Number.isFinite(numericValue)
        ? `@metadata_${metadataKey}:[${numericValue} ${numericValue}]`
        : `@metadata:${escapeTextQuery(`${metadataKey} ${String(metadataValue)}`)}`;
    } else if ((metadataField.type ?? "text") === "tag") {
      query = `@metadata_${metadataKey}:{${escapeTagValue(String(metadataValue))}}`;
    } else {
      query = `@metadata_${metadataKey}:${escapeTextQuery(String(metadataValue))}`;
    }

    return this.executeSearch(query, limit);
  }

  async executeQuery(
    query: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
    assert(query, "query cannot be null or empty");
    assert(limit > 0, "limit must be greater than 0");
    return this.executeSearch(query, limit);
  }

  private async initialize(): Promise<void> {
    if (!this._client.isOpen) {
      await this._client.connect();
    }

    if (!this._config.initializeSchema) {
      return;
    }

    await this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      const existingIndexes = await this.listIndexes();
      if (existingIndexes.includes(this._config.indexName)) {
        return;
      }

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
        for (const field of this._config.metadataFields) {
          const type = (field.type ?? "text").toUpperCase();
          schema[`$.metadata.${field.name}`] = {
            type:
              type === "NUMERIC"
                ? SCHEMA_FIELD_TYPE.NUMERIC
                : type === "TAG"
                  ? SCHEMA_FIELD_TYPE.TAG
                  : SCHEMA_FIELD_TYPE.TEXT,
            AS: `metadata_${field.name}`,
          };
        }
      } else {
        schema["$.metadata.*"] = {
          type: SCHEMA_FIELD_TYPE.TEXT,
          AS: "metadata",
        };
      }

      const response = await this._client.ft.create(
        this._config.indexName,
        schema,
        {
          ON: "JSON",
          PREFIX: [this._config.keyPrefix],
        },
      );

      if (response !== "OK") {
        throw new Error(`Failed to create index: ${String(response)}`);
      }
    } catch (error) {
      throw new Error("Could not initialize Redis schema", {
        cause: error,
      });
    }
  }

  private async listIndexes(): Promise<string[]> {
    const response = await this._client.sendCommand(["FT._LIST"]);

    if (!Array.isArray(response)) {
      return [];
    }

    return response
      .map((entry) =>
        typeof entry === "string" ? entry : Buffer.from(entry).toString(),
      )
      .filter((entry) => entry.length > 0);
  }

  private async getNextTimestampForConversation(
    conversationId: string,
  ): Promise<number> {
    const counterKey = `${this._config.keyPrefix}counter:${escapeKey(conversationId)}`;
    const baseTimestamp = Date.now();

    try {
      const setResult = await this._client.set(counterKey, `${baseTimestamp}`, {
        NX: true,
      });

      if (setResult === "OK") {
        await this.applyTtl(counterKey);
        return baseTimestamp;
      }

      const next = await this._client.incr(counterKey);
      await this.applyTtl(counterKey);
      return Number(next);
    } catch {
      return Date.now() * 1000 + Number(process.hrtime.bigint() % 1000n);
    }
  }

  private createKey(conversationId: string, timestamp: number): string {
    return `${this._config.keyPrefix}${escapeKey(conversationId)}:${timestamp}`;
  }

  private createMessageDocument(
    conversationId: string,
    message: Message,
    timestamp: number,
  ): StoredMessageDocument {
    const type = message.messageType.toString();
    const base: StoredMessageDocument = {
      conversation_id: conversationId,
      content: message.text ?? "",
      type,
      timestamp,
      metadata: normalizeObject(message.metadata),
    };

    if (message instanceof AssistantMessage) {
      base.toolCalls = [...message.toolCalls];
      base.media = message.media.map(serializeMedia);
    } else if (message instanceof UserMessage) {
      base.media = message.media.map(serializeMedia);
    } else if (message instanceof ToolResponseMessage) {
      base.toolResponses = [...message.responses];
    }

    return base;
  }

  private async findKeysForQuery(
    query: string,
    limit: number,
  ): Promise<string[]> {
    const rawResult = await this._client.ft.search(
      this._config.indexName,
      query,
      {
        LIMIT: { from: 0, size: limit },
      },
    );
    const result = asSearchReply(rawResult);
    return result.documents.map((doc) => doc.id);
  }

  private async executeSearch(
    query: string,
    limit: number,
  ): Promise<MessageWithConversation[]> {
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

    return this.processSearchResult(result);
  }

  private processSearchResult(result: SearchReply): MessageWithConversation[] {
    const messages: MessageWithConversation[] = [];

    for (const doc of result.documents) {
      const json = parseSearchDocumentValue(doc.value);
      if (!json) {
        continue;
      }

      const conversationId = asString(json.conversation_id);
      const timestamp = asNumber(json.timestamp);
      if (!conversationId) {
        continue;
      }

      messages.push({
        conversationId,
        timestamp,
        message: this.convertJsonToMessage(json),
      });
    }

    return messages;
  }

  private convertJsonToMessage(doc: Record<string, unknown>): Message {
    const type = asString(doc.type);
    const content = asString(doc.content);
    const metadata = normalizeObject(doc.metadata);

    if (type === MessageType.ASSISTANT.toString()) {
      return new AssistantMessage({
        content,
        properties: metadata,
        toolCalls: parseToolCalls(doc.toolCalls),
        media: parseMedia(doc.media),
      });
    }

    if (type === MessageType.USER.toString()) {
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
      return new ToolResponseMessage({
        properties: metadata,
        responses: parseToolResponses(doc.toolResponses),
      });
    }

    return new UserMessage({
      content: content ?? "",
      properties: metadata,
    });
  }

  private async applyTtl(key: string): Promise<void> {
    if (this._config.timeToLiveSeconds >= 0) {
      await this._client.expire(key, this._config.timeToLiveSeconds);
    }
  }
}

export class RedisChatMemoryRepositoryBuilder {
  private readonly _configBuilder = new RedisChatMemoryConfigBuilder();
  private _redisUrl: string | null = null;
  private _client: ReturnType<typeof createClient> | null = null;

  redisUrl(redisUrl: string): this {
    this._redisUrl = redisUrl;
    return this;
  }

  client(redisClient: ReturnType<typeof createClient>): this {
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
      this._client = createClient(
        this._redisUrl ? { url: this._redisUrl } : undefined,
      ).on("error", () => {
        // No-op to avoid unhandled "error" event crashes when caller does not attach listeners.
      });
      this._configBuilder.redisClient(this._client);
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
    const mimeType = asString(raw.mimeType);
    if (!mimeType) {
      continue;
    }

    const dataType = asString(raw.dataType);
    let data: unknown = raw.data;
    if (dataType === "base64" && typeof raw.data === "string") {
      try {
        data = Buffer.from(raw.data, "base64");
      } catch {
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

function serializeMedia(media: Media): StoredMedia {
  const data = media.data;
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return {
      id: media.id,
      name: media.name,
      mimeType: media.mimeType,
      data: Buffer.from(data).toString("base64"),
      dataType: "base64",
    };
  }

  return {
    id: media.id,
    name: media.name,
    mimeType: media.mimeType,
    data: normalizeValue(data),
  };
}

function escapeKey(value: string): string {
  return value.replaceAll(":", "_");
}

function escapeTagValue(value: string): string {
  return value.replaceAll(/([,.<>{}[\]"':;!@#$%^&*()\-+=~/\\| ])/g, "\\$1");
}

function escapeTextQuery(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => token.replaceAll(/([-@{}[\]|!()~"':;,.<>/?+=\\])/g, "\\$1"))
    .join(" ");
}

function toRedisJson(value: unknown): RedisJSON {
  return normalizeValue(value) as RedisJSON;
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
