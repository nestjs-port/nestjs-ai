import assert from "node:assert/strict";
import type { createClient } from "redis";

export type RedisChatMemoryMetadataFieldType = "text" | "numeric" | "tag";

export interface RedisChatMemoryMetadataField {
  name: string;
  type?: RedisChatMemoryMetadataFieldType;
}

export class RedisChatMemoryConfig {
  static readonly DEFAULT_INDEX_NAME = "chat-memory-idx";
  static readonly DEFAULT_KEY_PREFIX = "chat-memory:";
  static readonly DEFAULT_MAX_RESULTS = 1000;

  private readonly _client: ReturnType<typeof createClient>;
  private readonly _indexName: string;
  private readonly _keyPrefix: string;
  private readonly _timeToLiveSeconds: number;
  private readonly _isInitializeSchema: boolean;
  private readonly _maxConversationIds: number;
  private readonly _maxMessagesPerConversation: number;
  private readonly _metadataFields: RedisChatMemoryMetadataField[];

  constructor(builder: RedisChatMemoryConfigBuilder) {
    assert(builder.client, "Redis client must not be null");
    assert(builder.indexNameValue, "Index name must not be empty");
    assert(builder.keyPrefixValue, "Key prefix must not be empty");

    this._client = builder.client;
    this._indexName = builder.indexNameValue;
    this._keyPrefix = builder.keyPrefixValue;
    this._timeToLiveSeconds = builder.timeToLiveSecondsValue;
    this._isInitializeSchema = builder.initializeSchemaValue;
    this._maxConversationIds = builder.maxConversationIdsValue;
    this._maxMessagesPerConversation = builder.maxMessagesPerConversationValue;
    this._metadataFields = [...builder.metadataFieldsValue];
  }

  static builder(): RedisChatMemoryConfigBuilder {
    return new RedisChatMemoryConfigBuilder();
  }

  get client(): ReturnType<typeof createClient> {
    return this._client;
  }

  get indexName(): string {
    return this._indexName;
  }

  get keyPrefix(): string {
    return this._keyPrefix;
  }

  get timeToLiveSeconds(): number {
    return this._timeToLiveSeconds;
  }

  get isInitializeSchema(): boolean {
    return this._isInitializeSchema;
  }

  get maxConversationIds(): number {
    return this._maxConversationIds;
  }

  get maxMessagesPerConversation(): number {
    return this._maxMessagesPerConversation;
  }

  get metadataFields(): RedisChatMemoryMetadataField[] {
    return [...this._metadataFields];
  }
}

export class RedisChatMemoryConfigBuilder {
  private _clientValue: ReturnType<typeof createClient> | null = null;
  private _indexNameValue: string = RedisChatMemoryConfig.DEFAULT_INDEX_NAME;
  private _keyPrefixValue: string = RedisChatMemoryConfig.DEFAULT_KEY_PREFIX;
  private _timeToLiveSecondsValue: number = -1;
  private _initializeSchemaValue = true;
  private _maxConversationIdsValue = RedisChatMemoryConfig.DEFAULT_MAX_RESULTS;
  private _maxMessagesPerConversationValue =
    RedisChatMemoryConfig.DEFAULT_MAX_RESULTS;
  private _metadataFieldsValue: RedisChatMemoryMetadataField[] = [];

  get client(): ReturnType<typeof createClient> | null {
    return this._clientValue;
  }

  get indexNameValue(): string {
    return this._indexNameValue;
  }

  get keyPrefixValue(): string {
    return this._keyPrefixValue;
  }

  get timeToLiveSecondsValue(): number {
    return this._timeToLiveSecondsValue;
  }

  get initializeSchemaValue(): boolean {
    return this._initializeSchemaValue;
  }

  get maxConversationIdsValue(): number {
    return this._maxConversationIdsValue;
  }

  get maxMessagesPerConversationValue(): number {
    return this._maxMessagesPerConversationValue;
  }

  get metadataFieldsValue(): RedisChatMemoryMetadataField[] {
    return [...this._metadataFieldsValue];
  }

  redisClient(client: ReturnType<typeof createClient>): this {
    this._clientValue = client;
    return this;
  }

  indexName(indexName: string): this {
    this._indexNameValue = indexName;
    return this;
  }

  keyPrefix(keyPrefix: string): this {
    this._keyPrefixValue = keyPrefix;
    return this;
  }

  timeToLive(ttlSeconds: number | null): this {
    if (ttlSeconds != null) {
      this._timeToLiveSecondsValue = Math.trunc(ttlSeconds);
    }
    return this;
  }

  initializeSchema(initializeSchema: boolean): this {
    this._initializeSchemaValue = initializeSchema;
    return this;
  }

  maxConversationIds(maxConversationIds: number): this {
    this._maxConversationIdsValue = maxConversationIds;
    return this;
  }

  maxMessagesPerConversation(maxMessagesPerConversation: number): this {
    this._maxMessagesPerConversationValue = maxMessagesPerConversation;
    return this;
  }

  metadataFields(metadataFields: RedisChatMemoryMetadataField[]): this {
    this._metadataFieldsValue = [...metadataFields];
    return this;
  }

  build(): RedisChatMemoryConfig {
    return new RedisChatMemoryConfig(this);
  }
}
