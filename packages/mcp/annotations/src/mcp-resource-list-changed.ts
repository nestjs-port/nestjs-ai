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
import { MCP_RESOURCE_LIST_CHANGED_METADATA_KEY } from "./metadata.js";

export interface McpResourceListChangedOptions {
  /**
   * Used as connection or client identifier to select the MCP clients that the resource
   * change listener is associated with.
   */
  clients: string[];
}

export interface McpResourceListChangedMetadata {
  clients: string[];
}

/**
 * Annotation for methods that handle resource list change notifications from MCP servers.
 * This annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation are used to listen for notifications when the
 * list of available resources changes on an MCP server. According to the MCP
 * specification, servers that declare the `listChanged` capability will send
 * notifications when their resource list is modified.
 *
 * The annotated method must have a void return type for synchronous consumers, or can
 * return `Promise<void>` for asynchronous consumers. The method should accept a single
 * parameter of type `Resource[]` that represents the updated list of resources after the
 * change notification.
 *
 * @example
 * ```ts
 * @McpResourceListChanged({ clients: ["test-client"] })
 * onResourceListChanged(updatedResources: Resource[]): void {
 *   // Handle resource list change notification with the updated resources
 *   logger.info(`Resource list updated, now contains ${updatedResources.length} resources`);
 *   // Process the updated resource list
 * }
 *
 * @McpResourceListChanged({ clients: ["test-client"] })
 * async onResourceListChangedAsync(updatedResources: Resource[]): Promise<void> {
 *   // Handle resource list change notification asynchronously
 *   await processUpdatedResources(updatedResources);
 * }
 * ```
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/resources#list-changed-notification
 */
export function McpResourceListChanged(
  options: McpResourceListChangedOptions,
): MethodDecorator {
  const metadata: McpResourceListChangedMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_RESOURCE_LIST_CHANGED_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
