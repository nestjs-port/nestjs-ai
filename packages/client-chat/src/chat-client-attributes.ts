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

export class ChatClientAttributes {
  static readonly OUTPUT_FORMAT = new ChatClientAttributes(
    "spring.ai.chat.client.output.format",
  );

  static readonly STRUCTURED_OUTPUT_SCHEMA = new ChatClientAttributes(
    "spring.ai.chat.client.structured.output.schema",
  );

  static readonly STRUCTURED_OUTPUT_NATIVE = new ChatClientAttributes(
    "spring.ai.chat.client.structured.output.native",
  );

  private readonly _key: string;

  private constructor(key: string) {
    this._key = key;
  }

  get key(): string {
    return this._key;
  }
}
