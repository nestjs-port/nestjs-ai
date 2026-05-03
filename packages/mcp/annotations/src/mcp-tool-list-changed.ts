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
import type { Tool } from "@modelcontextprotocol/server";
import { MCP_TOOL_LIST_CHANGED_METADATA_KEY } from "./metadata.js";

export interface McpToolListChangedOptions {
  /**
   * Used as connection or client identifier to select the MCP clients that the tool
   * change listener is associated with.
   */
  clients: string[];
}

export interface McpToolListChangedMetadata {
  clients: string[];
}

type ExactToolListChangedMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpToolListChangedMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolListChangedMethodSignature<
      T,
      (updatedTools: Tool[]) => void | Promise<void>
    >
  >,
) => void;

/**
 * Annotation for methods that handle tool list change notifications from MCP servers.
 * This annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation are used to listen for notifications when the
 * list of available tools changes on an MCP server. According to the MCP specification,
 * servers that declare the `listChanged` capability will send notifications when their
 * tool list is modified.
 *
 * The annotated method must have a void return type for synchronous consumers, or can
 * return `Promise<void>` for asynchronous consumers. The method should accept a single
 * parameter of type `Tool[]` that represents the updated list of tools after the change
 * notification.
 *
 * @example
 * ```ts
 * @McpToolListChanged({ clients: ["test-client"] })
 * onToolListChanged(updatedTools: Tool[]): void {
 *   // Handle tool list change notification with the updated tools
 *   logger.info(`Tool list updated, now contains ${updatedTools.length} tools`);
 *   // Process the updated tool list
 * }
 *
 * @McpToolListChanged({ clients: ["test-client"] })
 * async onToolListChangedAsync(updatedTools: Tool[]): Promise<void> {
 *   // Handle tool list change notification asynchronously
 *   await processUpdatedTools(updatedTools);
 * }
 * ```
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools#list-changed-notification
 */
export function McpToolListChanged(
  options: McpToolListChangedOptions,
): McpToolListChangedMethodDecoratorFor;
export function McpToolListChanged(
  options: McpToolListChangedOptions,
): MethodDecorator {
  const metadata: McpToolListChangedMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_TOOL_LIST_CHANGED_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
