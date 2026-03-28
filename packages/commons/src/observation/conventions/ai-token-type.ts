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
 * Represents the type of AI token being measured.
 * Based on OpenTelemetry GenAI semantic conventions.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiTokenType {
  /**
   * Input token type (prompt tokens).
   */
  static readonly INPUT = new AiTokenType("input");

  /**
   * Output token type (completion tokens).
   */
  static readonly OUTPUT = new AiTokenType("output");

  /**
   * Total token type (combined input + output).
   */
  static readonly TOTAL = new AiTokenType("total");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the token type.
   * @returns the value of the token type
   */
  get value(): string {
    return this._value;
  }
}
