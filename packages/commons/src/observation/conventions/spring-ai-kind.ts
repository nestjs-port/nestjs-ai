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
 * Types of Spring AI constructs which can be observed.
 */
export class SpringAiKind {
  /**
   * Spring AI kind for advisor.
   */
  static readonly ADVISOR = new SpringAiKind("advisor");

  /**
   * Spring AI kind for chat client.
   */
  static readonly CHAT_CLIENT = new SpringAiKind("chat_client");

  /**
   * Spring AI kind for tool calling.
   */
  static readonly TOOL_CALL = new SpringAiKind("tool_call");

  /**
   * Spring AI kind for vector store.
   */
  static readonly VECTOR_STORE = new SpringAiKind("vector_store");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the Spring AI kind.
   * @returns the value of the Spring AI kind
   */
  get value(): string {
    return this._value;
  }
}
