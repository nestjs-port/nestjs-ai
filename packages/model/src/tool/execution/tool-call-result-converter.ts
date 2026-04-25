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

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

/**
 * A functional interface to convert tool call results to a String that can be sent back
 * to the AI model.
 */
export interface ToolCallResultConverter {
  /**
   * Given an Object returned by a tool, convert it to a String compatible with the
   * given return type.
   */
  convert(
    result?: unknown | null,
    returnType?: StandardSchemaWithJsonSchema | null,
  ): Promise<string>;
}
