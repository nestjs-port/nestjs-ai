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

import type { AsyncConverter } from "@nestjs-port/core";
import type { FormatProvider } from "./format-provider.js";

/**
 * Converts the (raw) LLM output into a structured responses of type. The
 * {@link FormatProvider.format} method should provide the LLM prompt description
 * of the desired format.
 */
export abstract class StructuredOutputConverter<T>
  implements AsyncConverter<string, T>, FormatProvider
{
  /**
   * Constant for when there is no JSON schema available.
   */
  static readonly NO_JSON_SCHEMA = "";

  /**
   * Converts the given source text into the desired target type.
   */
  abstract convert(source: string): Promise<T>;

  /**
   * Get the format of the output of a language generative.
   */
  abstract get format(): string;

  /**
   * Returns the JSON schema for the structured output of an LLM call.
   * @returns the JSON schema or {@link StructuredOutputConverter.NO_JSON_SCHEMA} if not
   * available
   */
  get jsonSchema(): string {
    return StructuredOutputConverter.NO_JSON_SCHEMA;
  }
}
