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
import { StringUtils } from "@nestjs-port/core";
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
