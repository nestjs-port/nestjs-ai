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

/**
 * Enumeration representing types of {@link Message Messages} in a chat application.
 * It can be one of the following: USER, ASSISTANT, SYSTEM, TOOL.
 */
export class MessageType {
  private readonly _value: string;
  private readonly _name: string;

  private constructor(name: string, value: string) {
    this._name = name;
    this._value = value;
  }

  /**
   * Get the string value of this message type.
   * @returns the string value (e.g., "user", "assistant", "system", "tool")
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Get the name of this message type.
   * @returns the name (e.g., "USER", "ASSISTANT", "SYSTEM", "TOOL")
   */
  getName(): string {
    return this._name;
  }

  /**
   * Convert to string representation (returns the name in uppercase).
   * @returns the name of the message type
   */
  toString(): string {
    return this._name;
  }

  /**
   * Convert to primitive value (returns the string value for JSON serialization).
   */
  [Symbol.toPrimitive](hint: string): string {
    if (hint === "string") {
      return this._name;
    }
    return this._value;
  }

  /**
   * A {@link Message} of type 'user', having the user role and originating
   * from an end-user or developer.
   * @see UserMessage
   */
  static readonly USER = new MessageType("USER", "user");

  /**
   * A {@link Message} of type 'assistant' passed in subsequent input
   * {@link Message Messages} as the {@link Message} generated in response to the user.
   * @see AssistantMessage
   */
  static readonly ASSISTANT = new MessageType("ASSISTANT", "assistant");

  /**
   * A {@link Message} of type 'system' passed as input {@link Message Messages}
   * containing high-level instructions for the conversation, such as behave
   * like a certain character or provide answers in a specific format.
   * @see SystemMessage
   */
  static readonly SYSTEM = new MessageType("SYSTEM", "system");

  /**
   * A {@link Message} of type 'tool' passed as input {@link Message Messages}
   * with function/tool content in a chat application.
   * @see ToolResponseMessage
   */
  static readonly TOOL = new MessageType("TOOL", "tool");
}
