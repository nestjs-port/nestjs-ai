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
import { MCP_PROMPT_LIST_CHANGED_METADATA_KEY } from "./metadata.js";

export interface McpPromptListChangedOptions {
  /**
   * Used as connection or client identifier to select the MCP client that the prompt
   * change listener is associated with. At least one client identifier must be
   * specified.
   */
  clients: string[];
}

export interface McpPromptListChangedMetadata {
  clients: string[];
}

/**
 * Annotation for methods that handle prompt list change notifications from MCP servers.
 * This annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation are used to listen for notifications when the
 * list of available prompts changes on an MCP server. According to the MCP specification,
 * servers that declare the `listChanged` capability will send notifications when their
 * prompt list is modified.
 *
 * The annotated method must have a void return type for synchronous consumers, or can
 * return `Promise<void>` for asynchronous consumers. The method should accept a single
 * parameter of type `Prompt[]` that represents the updated list of prompts after the
 * change notification.
 *
 * @example
 * ```ts
 * @McpPromptListChanged({ clients: ["test-client"] })
 * onPromptListChanged(updatedPrompts: Prompt[]): void {
 *   // Handle prompt list change notification with the updated prompts
 *   logger.info(`Prompt list updated, now contains ${updatedPrompts.length} prompts`);
 *   // Process the updated prompt list
 * }
 *
 * @McpPromptListChanged({ clients: ["test-client"] })
 * async onPromptListChangedAsync(updatedPrompts: Prompt[]): Promise<void> {
 *   // Handle prompt list change notification asynchronously
 *   await processUpdatedPrompts(updatedPrompts);
 * }
 * ```
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#list-changed-notification
 */
export function McpPromptListChanged(
  options: McpPromptListChangedOptions,
): MethodDecorator {
  const metadata: McpPromptListChangedMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_PROMPT_LIST_CHANGED_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
