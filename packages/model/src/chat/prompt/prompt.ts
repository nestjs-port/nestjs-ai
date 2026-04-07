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
import type { ModelRequest } from "../../model";
import {
  AssistantMessage,
  type Message,
  MessageType,
  SystemMessage,
  type ToolResponseMessage,
  UserMessage,
} from "../messages";
import type { ChatOptions } from "./chat-options.interface";

/**
 * Type guard to check if a message is a {@link UserMessage}.
 * @param message - The message to check.
 * @returns True if the message is a UserMessage, false otherwise.
 */
function isUserMessage(message: Message): message is UserMessage {
  return message.messageType === MessageType.USER;
}

/**
 * Type guard to check if a message is a {@link SystemMessage}.
 * @param message - The message to check.
 * @returns True if the message is a SystemMessage, false otherwise.
 */
function isSystemMessage(message: Message): message is SystemMessage {
  return message.messageType === MessageType.SYSTEM;
}

/**
 * Type guard to check if a message is an {@link AssistantMessage}.
 * @param message - The message to check.
 * @returns True if the message is an AssistantMessage, false otherwise.
 */
function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.messageType === MessageType.ASSISTANT;
}

/**
 * Type guard to check if a message is a {@link ToolResponseMessage}.
 * @param message - The message to check.
 * @returns True if the message is a ToolResponseMessage, false otherwise.
 */
function isToolResponseMessage(
  message: Message,
): message is ToolResponseMessage {
  return message.messageType === MessageType.TOOL;
}

/**
 * The Prompt class represents a prompt used in AI model requests.
 * A prompt consists of one or more messages and additional {@link ChatOptions}.
 *
 * @see {@link Message}
 * @see {@link ChatOptions}
 * @see {@link PromptBuilder}
 */
export class Prompt implements ModelRequest<Message[]> {
  private readonly messages: Message[];
  private readonly chatOptions: ChatOptions | null;

  constructor(content: string);
  constructor(message: Message);
  constructor(messages: Message[]);
  constructor(content: string, chatOptions: ChatOptions | null);
  constructor(message: Message, chatOptions: ChatOptions | null);
  constructor(messages: Message[], chatOptions: ChatOptions | null);
  constructor(
    contentOrMessageOrMessages: string | Message | Message[],
    chatOptions: ChatOptions | null = null,
  ) {
    assert(
      contentOrMessageOrMessages != null,
      "content or messages cannot be null",
    );

    if (typeof contentOrMessageOrMessages === "string") {
      this.messages = [UserMessage.of(contentOrMessageOrMessages)];
    } else if (Array.isArray(contentOrMessageOrMessages)) {
      assert(contentOrMessageOrMessages, "messages cannot be null");
      this.messages = contentOrMessageOrMessages;
    } else {
      assert(contentOrMessageOrMessages, "message cannot be null");
      this.messages = [contentOrMessageOrMessages];
    }
    this.chatOptions = chatOptions;
  }

  /**
   * Get the contents of all messages concatenated.
   * @returns The concatenated text content of all messages.
   */
  get contents(): string {
    return this.instructions.map((message) => message.text ?? "").join("");
  }

  /**
   * Get the chat options.
   * @returns The {@link ChatOptions} or null if not set.
   */
  get options(): ChatOptions | null {
    return this.chatOptions;
  }

  /**
   * Get the messages (instructions).
   * @returns The list of {@link Message} objects in this prompt.
   */
  get instructions(): Message[] {
    return this.messages;
  }

  /**
   * Get the first system message in the prompt.
   * If no system message is found, an empty {@link SystemMessage} is returned.
   * @returns The first {@link SystemMessage} in the prompt.
   */
  get systemMessage(): SystemMessage {
    for (const message of this.messages) {
      if (isSystemMessage(message)) {
        return message;
      }
    }
    return SystemMessage.of("");
  }

  /**
   * Get the last user message in the prompt.
   * If no user message is found, an empty {@link UserMessage} is returned.
   * @returns The last {@link UserMessage} in the prompt.
   */
  get userMessage(): UserMessage {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (isUserMessage(message)) {
        return message;
      }
    }
    return UserMessage.of("");
  }

  /**
   * Get the last user or tool response message in the prompt.
   * If no user or tool response message is found, an empty {@link UserMessage} is returned.
   * @returns The last {@link UserMessage} or {@link ToolResponseMessage} in the prompt.
   */
  get lastUserOrToolResponseMessage(): Message {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (isUserMessage(message) || isToolResponseMessage(message)) {
        return message;
      }
    }
    return UserMessage.of("");
  }

  /**
   * Get all user messages in the prompt.
   * @returns A list of all {@link UserMessage} objects in the prompt.
   */
  get userMessages(): UserMessage[] {
    return this.messages.filter(isUserMessage);
  }

  /**
   * Create a copy of this prompt.
   * @returns A new {@link Prompt} instance with copied messages and options.
   */
  copy(): Prompt {
    return new Prompt(
      this.instructionsCopy(),
      this.chatOptions?.copy() ?? null,
    );
  }

  private instructionsCopy(): Message[] {
    return this.messages.map((message) => {
      if (isUserMessage(message)) {
        return message.copy();
      }
      if (isSystemMessage(message)) {
        return message.copy();
      }
      if (isAssistantMessage(message)) {
        return new AssistantMessage({
          content: message.text ?? "",
          properties: message.metadata,
          toolCalls: message.toolCalls,
          media: message.media,
        });
      }
      if (isToolResponseMessage(message)) {
        return message.copy();
      }

      throw new Error(`Unsupported message type: ${message.messageType}`);
    });
  }

  /**
   * Augments the first system message in the prompt with the provided function.
   * If no system message is found, a new one is created with the provided text.
   * @param augmenter - A string to replace the system message text, or a function that transforms the {@link SystemMessage}.
   * @returns A new {@link Prompt} instance with the augmented system message.
   */
  augmentSystemMessage(
    augmenter: string | ((systemMessage: SystemMessage) => SystemMessage),
  ): Prompt {
    if (typeof augmenter === "string") {
      return this.augmentSystemMessage(
        (systemMessage) =>
          new SystemMessage({
            content: augmenter,
            properties: { ...systemMessage.metadata },
          }),
      );
    }

    const messagesCopy = [...this.messages];
    let found = false;

    for (let i = 0; i < messagesCopy.length; i++) {
      const message = messagesCopy[i];
      if (isSystemMessage(message)) {
        messagesCopy[i] = augmenter(message);
        found = true;
        break;
      }
    }

    if (!found) {
      messagesCopy.unshift(augmenter(SystemMessage.of("")));
    }

    return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
  }

  /**
   * Augments the last user message in the prompt with the provided function.
   * If no user message is found, a new one is created with the provided text.
   * @param augmenter - A string to replace the user message text, or a function that transforms the {@link UserMessage}.
   * @returns A new {@link Prompt} instance with the augmented user message.
   */
  augmentUserMessage(
    augmenter: string | ((userMessage: UserMessage) => UserMessage),
  ): Prompt {
    if (typeof augmenter === "string") {
      return this.augmentUserMessage(
        (userMessage) =>
          new UserMessage({
            content: augmenter,
            properties: { ...userMessage.metadata },
            media: [...userMessage.media],
          }),
      );
    }

    const messagesCopy = [...this.messages];

    for (let i = messagesCopy.length - 1; i >= 0; i--) {
      const message = messagesCopy[i];
      if (isUserMessage(message)) {
        messagesCopy[i] = augmenter(message);
        return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
      }
      if (i === 0) {
        messagesCopy.push(augmenter(UserMessage.of("")));
      }
    }

    return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
  }

  /**
   * Create a builder to mutate this prompt.
   * @returns A {@link PromptBuilder} initialized with copies of this prompt's messages and options.
   */
  mutate(): PromptBuilder {
    const builder = Prompt.builder().messages(this.instructionsCopy());
    if (this.chatOptions) {
      builder.chatOptions(this.chatOptions.copy());
    }
    return builder;
  }

  /**
   * Create a new builder for Prompt.
   * @returns A new {@link PromptBuilder} instance.
   */
  static builder(): PromptBuilder {
    return new PromptBuilder();
  }

  toString(): string {
    return `Prompt{messages=${JSON.stringify(this.messages)}, modelOptions=${JSON.stringify(this.chatOptions)}}`;
  }
}

/**
 * Builder for {@link Prompt}.
 * Provides a fluent API to construct {@link Prompt} instances.
 *
 * @see {@link Prompt.builder}
 * @see {@link Prompt.mutate}
 */
export class PromptBuilder {
  private _messages: Message[] | null = null;
  private _chatOptions: ChatOptions | null = null;

  /**
   * Set the content as a single {@link UserMessage}.
   * @param content - The text content for the user message.
   * @returns This builder instance for chaining.
   */
  content(content: string): PromptBuilder {
    this._messages = [UserMessage.of(content)];
    return this;
  }

  /**
   * Set the messages for the prompt.
   * @param messages - An array of {@link Message} objects.
   * @returns This builder instance for chaining.
   */
  messages(messages: Message[]): PromptBuilder;
  /**
   * Set the messages for the prompt.
   * @param messages - The {@link Message} objects as variadic arguments.
   * @returns This builder instance for chaining.
   */
  messages(...messages: Message[]): PromptBuilder;
  messages(
    messagesOrFirst: Message | Message[],
    ...rest: Message[]
  ): PromptBuilder {
    if (Array.isArray(messagesOrFirst) && rest.length === 0) {
      this._messages = messagesOrFirst;
    } else if (messagesOrFirst) {
      this._messages = [messagesOrFirst as Message, ...rest];
    }
    return this;
  }

  /**
   * Set the chat options for the prompt.
   * @param chatOptions - The {@link ChatOptions} to use.
   * @returns This builder instance for chaining.
   */
  chatOptions(chatOptions: ChatOptions): PromptBuilder {
    this._chatOptions = chatOptions;
    return this;
  }

  /**
   * Build the {@link Prompt} instance.
   * @returns A new {@link Prompt} instance.
   * @throws {AssertionError} If neither messages nor content has been set.
   */
  build(): Prompt {
    assert(this._messages, "either messages or content needs to be set");
    return new Prompt(this._messages, this._chatOptions);
  }
}
