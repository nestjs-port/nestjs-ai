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
import type {
  PromptReference,
  ResourceTemplateReference,
} from "@modelcontextprotocol/sdk/spec.types.js";
import type { McpCompleteMetadata } from "../mcp-complete.js";

export type CompleteReference = PromptReference | ResourceTemplateReference;

/**
 * Utility class for adapting between `McpComplete` annotations and MCP completion
 * references.
 */
export abstract class CompleteAdapter {
  private constructor() {}

  /**
   * Convert a `McpComplete` metadata object to an MCP completion reference.
   *
   * @param mcpComplete the completion metadata
   * @returns the corresponding completion reference
   * @throws {Error} if neither prompt nor uri is provided, or if both are provided
   */
  static asCompleteReference(
    mcpComplete: McpCompleteMetadata | null | undefined,
  ): CompleteReference {
    assert(mcpComplete != null, "mcpComplete cannot be null");
    const prompt = mcpComplete.prompt;
    const uri = mcpComplete.uri;

    // Validate that either prompt or uri is provided, but not both
    if (
      (prompt == null || prompt.length === 0) &&
      (uri == null || uri.length === 0)
    ) {
      throw new Error(
        "Either prompt or uri must be provided in McpComplete metadata",
      );
    }
    if (prompt != null && prompt.length > 0 && uri != null && uri.length > 0) {
      throw new Error(
        "Only one of prompt or uri can be provided in McpComplete metadata",
      );
    }

    // Create the appropriate reference type based on what's provided
    if (prompt != null && prompt.length > 0) {
      return { type: "ref/prompt", name: prompt };
    }

    return { type: "ref/resource", uri };
  }
}
