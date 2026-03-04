import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import type { Message } from "../messages";
import type { ChatMemoryRepository } from "./chat-memory-repository";

export class InMemoryChatMemoryRepository implements ChatMemoryRepository {
  private readonly _chatMemoryStore = new Map<string, Message[]>();

  async findConversationIds(): Promise<string[]> {
    return [...this._chatMemoryStore.keys()];
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    const messages = this._chatMemoryStore.get(conversationId);
    return messages != null ? [...messages] : [];
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
    this._chatMemoryStore.set(conversationId, messages);
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    this._chatMemoryStore.delete(conversationId);
  }
}
