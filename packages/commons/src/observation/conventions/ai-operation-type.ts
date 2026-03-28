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
 * Represents the type of AI operation being performed.
 * Based on OpenTelemetry GenAI semantic conventions.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiOperationType {
  /**
   * Chat operation type.
   */
  static readonly CHAT = new AiOperationType("chat");

  /**
   * Embedding operation type.
   */
  static readonly EMBEDDING = new AiOperationType("embedding");

  /**
   * Framework operation type.
   */
  static readonly FRAMEWORK = new AiOperationType("framework");

  /**
   * Image generation operation type.
   */
  static readonly IMAGE = new AiOperationType("image");

  /**
   * Text completion operation type.
   */
  static readonly TEXT_COMPLETION = new AiOperationType("text_completion");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the operation type.
   * @returns the value of the operation type
   */
  get value(): string {
    return this._value;
  }
}
