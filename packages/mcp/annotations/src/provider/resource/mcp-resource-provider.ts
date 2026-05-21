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

import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { ResourceAdapter } from "../../adapter/resource-adapter.js";
import {
  McpResourceMethodCallback,
  type ResourceRegistration,
} from "../../method/resource/mcp-resource-method-callback.js";
import { MCP_RESOURCE_METADATA_KEY } from "../../metadata.js";
import type { McpResourceMetadata } from "../../mcp-resource.js";

export interface McpResourceProviderProps {
  resourceObjects: object[];
  mcpServer: McpServer;
}

/**
 * Discovers `@McpResource`-annotated methods on a list of bean objects and
 * produces {@link ResourceRegistration} tuples ready to spread into
 * {@link McpServer.registerResource}.
 */
export class McpResourceProvider {
  private readonly _resourceObjects: readonly object[];

  private readonly _mcpServer: McpServer;

  constructor(props: McpResourceProviderProps) {
    assert(props.resourceObjects != null, "resourceObjects can't be null!");
    assert(props.mcpServer != null, "mcpServer can't be null!");

    this._resourceObjects = [...props.resourceObjects];
    this._mcpServer = props.mcpServer;
  }

  /**
   * Build the registration tuple for each `@McpResource`-decorated method on
   * every supplied bean. Tuples are sorted by property key for deterministic
   * output across runs.
   */
  getResourceRegistrations(): ResourceRegistration[] {
    return this._resourceObjects.flatMap((resourceObject) =>
      this.discoverResourceMethods(resourceObject).map((propertyKey) => {
        const metadata = this.getResourceMetadata(resourceObject, propertyKey);
        if (metadata == null) {
          throw new Error(
            `@McpResource metadata missing on ${String(propertyKey)}`,
          );
        }

        const resource = ResourceAdapter.asResource(metadata);
        resource.name = metadata.name.length > 0 ? metadata.name : "";

        if (this.isUriTemplate(metadata.uri)) {
          const resourceTemplate = new ResourceTemplate(metadata.uri, {
            list: undefined,
          });

          const callback = new McpResourceMethodCallback({
            provider: resourceObject,
            propertyKey,
            resource,
            resourceTemplate,
            mcpServer: this._mcpServer,
          });

          return callback.apply();
        }

        const callback = new McpResourceMethodCallback({
          provider: resourceObject,
          propertyKey,
          resource,
          mcpServer: this._mcpServer,
        });

        return callback.apply();
      }),
    );
  }

  private discoverResourceMethods(bean: object): (string | symbol)[] {
    const prototype = Object.getPrototypeOf(bean) as object;
    return Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== "constructor")
      .filter(
        (name) => typeof (bean as Record<string, unknown>)[name] === "function",
      )
      .filter((name) => this.getResourceMetadata(bean, name) != null)
      .sort((a, b) => a.localeCompare(b));
  }

  private getResourceMetadata(
    bean: object,
    propertyKey: string | symbol,
  ): McpResourceMetadata | null {
    return (
      (Reflect.getMetadata(
        MCP_RESOURCE_METADATA_KEY,
        Object.getPrototypeOf(bean),
        propertyKey,
      ) as McpResourceMetadata | undefined) ?? null
    );
  }

  private isUriTemplate(uri: string): boolean {
    return /\{[^/]+?\}/.test(uri);
  }
}
