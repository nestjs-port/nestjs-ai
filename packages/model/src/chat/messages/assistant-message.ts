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

import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message.js";
import { MessageType } from "./message-type.js";

/**
 * Represents a tool call made by the assistant.
 */
export interface ToolCall {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly arguments: string;
}

export interface AssistantMessageProps {
  content?: string | null;
  properties?: Record<string, unknown>;
  toolCalls?: ToolCall[];
  media?: Media[];
}

/**
 * Lets the generative know the content was generated as a response to the user.
 * This role indicates messages that the generative has previously generated in the conversation.
 * By including assistant messages in the series, you provide context to the generative
 * about prior exchanges in the conversation.
 */
export class AssistantMessage extends AbstractMessage implements MediaContent {
  private readonly _toolCalls: ToolCall[];
  protected readonly _media: Media[];

  constructor(props: AssistantMessageProps = {}) {
    super(MessageType.ASSISTANT, props.content ?? null, props.properties ?? {});

    this._toolCalls = props.toolCalls ?? [];
    this._media = props.media ?? [];
  }

  /**
   * Create an AssistantMessage with text content.
   */
  static of(content: string): AssistantMessage {
    return new AssistantMessage({ content });
  }

  /**
   * Get the tool calls made by the assistant.
   */
  get toolCalls(): ToolCall[] {
    return this._toolCalls;
  }

  /**
   * Check if this message has tool calls.
   */
  hasToolCalls(): boolean {
    return this._toolCalls.length > 0;
  }

  /**
   * Get the media associated with the message.
   */
  get media(): Media[] {
    return this._media;
  }

  [Symbol.toPrimitive](): string {
    return `AssistantMessage [messageType=${this.messageType}, toolCalls=${JSON.stringify(this.toolCalls)}, textContent=${this.text}, metadata=${JSON.stringify(this.metadata)}]`;
  }
}
