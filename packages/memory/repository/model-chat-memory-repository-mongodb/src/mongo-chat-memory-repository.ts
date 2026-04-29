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
import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  MessageType,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory, StringUtils } from "@nestjs-port/core";
import type { Collection, Db, MongoClient } from "mongodb";
import type { Conversation } from "./conversation.js";

export class MongoChatMemoryRepository implements ChatMemoryRepository {
  static readonly DEFAULT_COLLECTION_NAME = "ai_chat_memory";

  private static readonly logger = LoggerFactory.getLogger(
    MongoChatMemoryRepository.name,
  );

  private readonly _collection: Collection<Conversation>;

  constructor(collection: Collection<Conversation>) {
    assert(collection, "collection cannot be null");
    this._collection = collection;
  }

  static builder(): MongoChatMemoryRepositoryBuilder {
    return new MongoChatMemoryRepositoryBuilder();
  }

  async findConversationIds(): Promise<string[]> {
    const conversationIds = await this._collection.distinct("conversationId");
    return conversationIds.filter(
      (conversationId): conversationId is string =>
        typeof conversationId === "string",
    );
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );

    const conversations = await this._collection
      .find({ conversationId })
      .sort({ timestamp: 1 })
      .toArray();

    return conversations.map((conversation) =>
      MongoChatMemoryRepository.mapMessage(conversation),
    );
  }

  async saveAll(conversationId: string, messages: Message[]): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    assert(messages != null, "messages cannot be null");
    for (const message of messages) {
      assert(message != null, "messages cannot contain null elements");
    }

    await this.deleteByConversationId(conversationId);

    if (messages.length === 0) {
      return;
    }

    const conversations: Conversation[] = messages.map((message) => {
      return {
        conversationId,
        message: {
          content: message.text,
          type: message.messageType.toString(),
          metadata: { ...message.metadata },
        },
        timestamp: new Date(),
      };
    });

    await this._collection.insertMany(conversations);
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );

    await this._collection.deleteMany({ conversationId });
  }

  static mapMessage(conversation: Conversation): Message {
    const content = conversation.message.content ?? "";
    const messageType = conversation.message.type.toUpperCase();

    switch (messageType) {
      case MessageType.USER.getName():
        return new UserMessage({
          content,
          properties: conversation.message.metadata,
        });
      case MessageType.ASSISTANT.getName():
        return new AssistantMessage({
          content,
          properties: conversation.message.metadata,
        });
      case MessageType.SYSTEM.getName():
        return new SystemMessage({
          content,
          properties: conversation.message.metadata,
        });
      default:
        MongoChatMemoryRepository.logger.warn(
          `Unsupported message type: ${conversation.message.type}`,
        );
        throw new Error(
          `Unsupported message type: ${conversation.message.type}`,
        );
    }
  }
}

export class MongoChatMemoryRepositoryBuilder {
  private _collection: Collection<Conversation> | null = null;
  private _db: Db | null = null;
  private _collectionName = MongoChatMemoryRepository.DEFAULT_COLLECTION_NAME;
  private _mongoClient: MongoClient | null = null;

  collection(collection: Collection<Conversation>): this {
    this._collection = collection;
    return this;
  }

  db(db: Db): this {
    this._db = db;
    return this;
  }

  collectionName(collectionName: string): this {
    assert(
      StringUtils.hasText(collectionName),
      "collectionName cannot be null or empty",
    );
    this._collectionName = collectionName;
    return this;
  }

  mongoClient(mongoClient: MongoClient): this {
    this._mongoClient = mongoClient;
    return this;
  }

  build(): MongoChatMemoryRepository {
    const collection = this.resolveCollection();
    return new MongoChatMemoryRepository(collection);
  }

  private resolveCollection(): Collection<Conversation> {
    if (this._collection != null) {
      return this._collection;
    }

    if (this._db != null) {
      return this._db.collection<Conversation>(this._collectionName);
    }

    if (this._mongoClient != null) {
      return this._mongoClient
        .db()
        .collection<Conversation>(this._collectionName);
    }

    throw new Error("collection, db, or mongoClient must be provided");
  }
}
