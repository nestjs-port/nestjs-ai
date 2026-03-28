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
import assert from "node:assert/strict";
import { LoggerFactory, ParsingUtils } from "@nestjs-ai/commons";
import { TOOL_METADATA_KEY, type ToolAnnotationMetadata } from "../annotation";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";
import type { ToolCallback } from "../tool-callback";

/**
 * Miscellaneous tool utility methods. Mainly for internal use within the framework.
 */
export abstract class ToolUtils {
  /**
   * Regular expression pattern for recommended tool names. Tool names should contain
   * only alphanumeric characters, underscores, hyphens, and dots for maximum
   * compatibility across different LLMs.
   */
  private static readonly RECOMMENDED_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

  private static readonly logger = LoggerFactory.getLogger(ToolUtils.name);

  static getToolDescriptionFromName(toolName: string): string {
    assert(
      toolName && toolName.trim() !== "",
      "toolName cannot be null or empty",
    );
    return ParsingUtils.reConcatenateCamelCase(toolName, " ");
  }

  static getToolName(
    methodName: string,
    metadata?: ToolAnnotationMetadata,
  ): string {
    assert(
      methodName && methodName.trim() !== "",
      "methodName cannot be null or empty",
    );
    const toolName =
      metadata?.name && metadata.name.trim() !== ""
        ? metadata.name
        : methodName;
    ToolUtils.validateToolName(toolName);
    return toolName;
  }

  static getToolDescription(
    methodName: string,
    metadata?: ToolAnnotationMetadata,
  ): string {
    assert(
      methodName && methodName.trim() !== "",
      "methodName cannot be null or empty",
    );
    if (metadata == null) {
      return ToolUtils.getToolDescriptionFromName(methodName);
    }
    return metadata.description && metadata.description.trim() !== ""
      ? metadata.description
      : methodName;
  }

  static getToolReturnDirect(
    target: object,
    propertyKey: string | symbol,
  ): boolean {
    assert(target, "target cannot be null");
    assert(propertyKey, "propertyKey cannot be null");

    const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
      | ToolAnnotationMetadata
      | undefined;
    return tool != null && tool.returnDirect === true;
  }

  static getToolCallResultConverter(
    target: object,
    propertyKey: string | symbol,
  ): ToolCallResultConverter {
    assert(target, "target cannot be null");
    assert(propertyKey, "propertyKey cannot be null");

    const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
      | ToolAnnotationMetadata
      | undefined;
    if (tool == null) {
      return new DefaultToolCallResultConverter();
    }

    const type = tool.resultConverter;
    if (type == null) {
      return new DefaultToolCallResultConverter();
    }

    try {
      return new type();
    } catch (e) {
      throw new Error(
        `Failed to instantiate ToolCallResultConverter: ${type.name}. ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  static getDuplicateToolNames(toolCallbacks: ToolCallback[]): string[] {
    assert(toolCallbacks, "toolCallbacks cannot be null");

    const nameCounts = new Map<string, number>();
    for (const toolCallback of toolCallbacks) {
      const name = toolCallback.toolDefinition.name;
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }

    const duplicates: string[] = [];
    for (const [name, count] of nameCounts.entries()) {
      if (count > 1) {
        duplicates.push(name);
      }
    }

    return duplicates;
  }

  static getDuplicateToolNamesVarArgs(
    ...toolCallbacks: ToolCallback[]
  ): string[] {
    assert(toolCallbacks, "toolCallbacks cannot be null");
    return ToolUtils.getDuplicateToolNames(toolCallbacks);
  }

  /**
   * Validates that a tool name follows recommended naming conventions. Logs a warning
   * if the tool name contains characters that may not be compatible with some LLMs.
   * @param toolName - The tool name to validate
   */
  static validateToolName(toolName: string): void {
    assert(
      toolName && toolName.trim() !== "",
      "Tool name cannot be null or empty",
    );
    if (!ToolUtils.RECOMMENDED_NAME_PATTERN.test(toolName)) {
      ToolUtils.logger.warn(
        `Tool name '${toolName}' may not be compatible with some LLMs (e.g., OpenAI). ` +
          "Consider using only alphanumeric characters, underscores, hyphens, and dots.",
      );
    }
  }
}
