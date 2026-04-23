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
import type { Message } from "../messages/index.js";

/**
 * The contract for storing and managing the memory of chat conversations.
 */
export abstract class ChatMemory {
  static readonly DEFAULT_CONVERSATION_ID = "default";

  /**
   * The key to retrieve the chat memory conversation id from the context.
   */
  static readonly CONVERSATION_ID = "chat_memory_conversation_id";

  add(conversationId: string, message: Message): Promise<void>;
  add(conversationId: string, messages: Message[]): Promise<void>;
  add(
    conversationId: string,
    messageOrMessages: Message | Message[],
  ): Promise<void> {
    assert(
      StringUtils.hasText(conversationId),
      "conversationId cannot be null or empty",
    );
    assert(messageOrMessages != null, "message cannot be null");

    const messages = Array.isArray(messageOrMessages)
      ? [...messageOrMessages]
      : [messageOrMessages];

    return this.addMessages(conversationId, messages);
  }

  /**
   * Save the specified messages in the chat memory for the specified conversation.
   */
  protected abstract addMessages(
    conversationId: string,
    messages: Message[],
  ): Promise<void>;

  /**
   * Get the messages in the chat memory for the specified conversation.
   */
  abstract get(conversationId: string): Promise<Message[]>;

  /**
   * Clear the chat memory for the specified conversation.
   */
  abstract clear(conversationId: string): Promise<void>;
}
