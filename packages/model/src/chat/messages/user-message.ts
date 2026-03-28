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
import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

export interface UserMessageProps {
  content?: string | null;
  properties?: Record<string, unknown>;
  media?: Media[];
}

/**
 * A message of the type 'user' passed as input.
 * Messages with the user role are from the end-user or developer.
 * They represent questions, prompts, or any input that you want
 * the generative to respond to.
 */
export class UserMessage extends AbstractMessage implements MediaContent {
  protected readonly _media: Media[];

  constructor(options: UserMessageProps = {}) {
    super(MessageType.USER, options.content ?? null, options.properties ?? {});
    const media = options.media ?? [];
    assert(media !== undefined, "Media must not be undefined");
    this._media = [...media];
  }

  /**
   * Create a UserMessage with text content.
   */
  static of(textContent: string): UserMessage {
    return new UserMessage({ content: textContent, media: [] });
  }

  /**
   * Get the media associated with the message.
   */
  get media(): Media[] {
    return this._media;
  }

  /**
   * Create a copy of this message.
   */
  copy(): UserMessage {
    return new UserMessage({
      content: this.text,
      properties: { ...this.metadata },
      media: [...this._media],
    });
  }
}
