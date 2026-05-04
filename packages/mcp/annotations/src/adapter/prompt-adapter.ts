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

import "reflect-metadata";
import type { Prompt, PromptArgument } from "@modelcontextprotocol/server";
import { MetaUtils } from "../common/index.js";
import type { McpPromptMetadata } from "../mcp-prompt.js";

type PromptMethodTarget = object;

type PromptMethodPropertyKey = string | symbol;

/**
 * Utility class for adapting between `McpPrompt` metadata and MCP prompt objects.
 */
export abstract class PromptAdapter {
  private constructor() {}

  /**
   * Convert prompt metadata to an MCP prompt object.
   *
   * @param mcpPrompt the prompt metadata
   * @returns the corresponding MCP prompt object
   */
  static asPrompt(mcpPrompt: McpPromptMetadata): Prompt;

  /**
   * Convert prompt metadata and a method target to an MCP prompt object.
   *
   * @param mcpPrompt the prompt metadata
   * @param target the class prototype or constructor that owns the method
   * @param propertyKey the method name
   * @returns the corresponding MCP prompt object
   */
  static asPrompt(
    mcpPrompt: McpPromptMetadata,
    target: PromptMethodTarget,
    propertyKey: PromptMethodPropertyKey,
  ): Prompt;

  static asPrompt(
    mcpPrompt: McpPromptMetadata,
    target?: PromptMethodTarget,
    propertyKey?: PromptMethodPropertyKey,
  ): Prompt {
    const promptArguments = PromptAdapter.toPromptArguments(
      mcpPrompt.arguments,
    );
    return PromptAdapter.createPrompt(mcpPrompt, promptArguments, propertyKey);
  }

  private static createPrompt(
    mcpPrompt: McpPromptMetadata,
    promptArguments: PromptArgument[],
    propertyKey?: PromptMethodPropertyKey,
  ): Prompt {
    const meta = MetaUtils.getMeta(mcpPrompt.metaProvider);
    return {
      name:
        propertyKey == null
          ? mcpPrompt.name
          : PromptAdapter.getName(mcpPrompt, propertyKey),
      title: mcpPrompt.title || undefined,
      description: mcpPrompt.description || undefined,
      arguments: promptArguments,
      _meta: meta ?? undefined,
    };
  }

  private static toPromptArguments(
    promptArguments: McpPromptMetadata["arguments"],
  ): PromptArgument[] {
    return Object.entries(promptArguments).map(([name, metadata]) => ({
      name,
      description: metadata.description || undefined,
      required: metadata.required ?? false,
    }));
  }

  private static getName(
    promptAnnotation: McpPromptMetadata | null | undefined,
    propertyKey: PromptMethodPropertyKey,
  ): string {
    if (
      promptAnnotation == null ||
      promptAnnotation.name == null ||
      promptAnnotation.name.length === 0
    ) {
      return typeof propertyKey === "string"
        ? propertyKey
        : propertyKey.toString();
    }
    return promptAnnotation.name;
  }
}
