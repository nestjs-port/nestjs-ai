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

import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

export interface SystemMessageProps {
  content?: string | null;
  properties?: Record<string, unknown>;
}

/**
 * A message of the type 'system' passed as input.
 * The system message gives high level instructions for the conversation.
 * This role typically provides high-level instructions for the conversation.
 * For example, you might use a system message to instruct the generative
 * to behave like a certain character or to provide answers in a specific format.
 */
export class SystemMessage extends AbstractMessage {
  constructor(options: SystemMessageProps = {}) {
    super(
      MessageType.SYSTEM,
      options.content ?? null,
      options.properties ?? {},
    );
  }

  /**
   * Create a SystemMessage with text content.
   */
  static of(textContent: string): SystemMessage {
    return new SystemMessage({ content: textContent });
  }

  /**
   * Create a copy of this message.
   */
  copy(): SystemMessage {
    return new SystemMessage({
      content: this.text,
      properties: { ...this.metadata },
    });
  }
}
