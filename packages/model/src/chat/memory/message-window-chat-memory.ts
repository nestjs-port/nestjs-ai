import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import type { Message } from "../messages";
import { SystemMessage } from "../messages";
import { ChatMemory } from "./chat-memory";
import type { ChatMemoryRepository } from "./chat-memory-repository";

const DEFAULT_MAX_MESSAGES = 20;

export interface MessageWindowChatMemoryProps {
  chatMemoryRepository: ChatMemoryRepository;
  maxMessages?: number;
}

/**
 * A chat memory implementation that maintains a message window of a specified size.
 */
export class MessageWindowChatMemory extends ChatMemory {
  private readonly _chatMemoryRepository: ChatMemoryRepository;

  private readonly _maxMessages: number;

  constructor({
    chatMemoryRepository,
    maxMessages = DEFAULT_MAX_MESSAGES,
  }: MessageWindowChatMemoryProps) {
    super();
    assert(chatMemoryRepository != null, "chatMemoryRepository cannot be null");
    assert(maxMessages > 0, "maxMessages must be greater than 0");

    this._chatMemoryRepository = chatMemoryRepository;
    this._maxMessages = maxMessages;
  }

  protected addMessages(
    conversationId: string,
    messages: Message[],
  ): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    assert(messages != null, "messages cannot be null");
    assert(
      messages.every((message) => message != null),
      "messages cannot contain null elements",
    );

    return this._chatMemoryRepository
      .findByConversationId(conversationId)
      .then((memoryMessages) => this.process(memoryMessages, messages))
      .then((processedMessages) =>
        this._chatMemoryRepository.saveAll(conversationId, processedMessages),
      );
  }

  get(conversationId: string): Promise<Message[]> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    return this._chatMemoryRepository.findByConversationId(conversationId);
  }

  clear(conversationId: string): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    return this._chatMemoryRepository.deleteByConversationId(conversationId);
  }

  private process(
    memoryMessages: Message[],
    newMessages: Message[],
  ): Message[] {
    const processedMessages: Message[] = [];

    const memoryMessagesSet = new Set(memoryMessages);
    const hasNewSystemMessage = newMessages
      .filter((message) => message instanceof SystemMessage)
      .some((message) => !memoryMessagesSet.has(message));

    const filteredMemoryMessages = memoryMessages.filter(
      (message) => !(hasNewSystemMessage && message instanceof SystemMessage),
    );
    processedMessages.push(...filteredMemoryMessages);

    processedMessages.push(...newMessages);

    if (processedMessages.length <= this._maxMessages) {
      return processedMessages;
    }

    const messagesToRemove = processedMessages.length - this._maxMessages;

    const trimmedMessages: Message[] = [];
    let removed = 0;

    for (const message of processedMessages) {
      if (message instanceof SystemMessage || removed >= messagesToRemove) {
        trimmedMessages.push(message);
      } else {
        removed++;
      }
    }

    return trimmedMessages;
  }
}
