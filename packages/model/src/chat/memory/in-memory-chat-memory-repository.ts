import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import type { Message } from "../messages";
import type { ChatMemoryRepository } from "./chat-memory-repository";

export class InMemoryChatMemoryRepository implements ChatMemoryRepository {
  private readonly _chatMemoryStore = new Map<string, Message[]>();

  findConversationIds(): string[] {
    return [...this._chatMemoryStore.keys()];
  }

  findByConversationId(conversationId: string): Message[] {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    const messages = this._chatMemoryStore.get(conversationId);
    return messages != null ? [...messages] : [];
  }

  saveAll(conversationId: string, messages: Message[]): void {
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

  deleteByConversationId(conversationId: string): void {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    this._chatMemoryStore.delete(conversationId);
  }
}
