/*
 * Copyright 2026-present the original author or authors.
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

import { MCP_TOOL_METADATA_KEY } from "../../metadata.js";
import {
  McpToolMethodCallback,
  type ToolRegistration,
} from "../../method/index.js";
import type { McpToolMetadata } from "../../mcp-tool.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";

export interface McpToolProviderProps {
  toolObjects: object[];
}

/**
 * Discovers `@McpTool`-annotated methods on a list of bean objects and produces
 * {@link ToolRegistration} tuples ready to spread into MCP server registration.
 */
export class McpToolProvider {
  private readonly _toolObjects: readonly object[];

  constructor(props: McpToolProviderProps) {
    assert(props.toolObjects != null, "toolObjects can't be null!");
    this._toolObjects = [...props.toolObjects];
  }

  /**
   * Build the registration tuple for each `@McpTool`-decorated method on every
   * supplied bean. Tuples are sorted by property key for deterministic output across
   * runs.
   */
  getToolRegistrations(): ToolRegistration[] {
    return this._toolObjects.flatMap((toolObject) =>
      discoverAnnotatedMethodKeys(toolObject, MCP_TOOL_METADATA_KEY).map(
        (propertyKey) => {
          const metadata = getAnnotatedMethodMetadata<McpToolMetadata>(
            toolObject,
            propertyKey,
            MCP_TOOL_METADATA_KEY,
          );
          if (metadata == null) {
            throw new Error(
              `@McpTool metadata missing on ${String(propertyKey)}`,
            );
          }

          const callback = new McpToolMethodCallback({
            provider: toolObject,
            propertyKey,
            returnMode: metadata.returnMode,
            returnSchema: metadata.returnSchema,
          });

          return callback.apply();
        },
      ),
    );
  }
}
