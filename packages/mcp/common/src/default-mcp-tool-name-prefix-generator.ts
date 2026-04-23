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
  Implementation,
  InitializeResult,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { McpConnectionInfo } from "./mcp-connection-info.js";
import { McpToolNamePrefixGenerator } from "./mcp-tool-name-prefix-generator.js";
import { McpToolUtils } from "./mcp-tool-utils.js";

export class DefaultMcpToolNamePrefixGenerator extends McpToolNamePrefixGenerator {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    DefaultMcpToolNamePrefixGenerator.name,
  );

  // Idempotency tracking. For a given combination of (client, server, tool) we will
  // generate a unique tool name only once.
  private readonly _existingConnections = new Set<string>();

  private readonly _allUsedToolNames = new Set<string>();

  private _counter = 1;

  override prefixedToolName(
    mcpConnectionInfo: McpConnectionInfo,
    tool: McpTool,
  ): string {
    let uniqueToolName = McpToolUtils.format(tool.name);

    const connectionKey = DefaultMcpToolNamePrefixGenerator.connectionKey(
      mcpConnectionInfo.clientInfo,
      mcpConnectionInfo.initializeResult?.serverInfo ?? null,
      tool,
    );

    if (!this._existingConnections.has(connectionKey)) {
      this._existingConnections.add(connectionKey);

      if (this._allUsedToolNames.has(uniqueToolName)) {
        uniqueToolName = `alt_${this._counter++}_${uniqueToolName}`;
        this._allUsedToolNames.add(uniqueToolName);
        DefaultMcpToolNamePrefixGenerator.logger.warn(
          "Tool name '{}' already exists. Using unique tool name '{}'",
          tool.name,
          uniqueToolName,
        );
      } else {
        this._allUsedToolNames.add(uniqueToolName);
      }
    }

    return uniqueToolName;
  }

  private static connectionKey(
    clientInfo: Implementation,
    serverInfo: InitializeResult["serverInfo"] | null,
    tool: McpTool,
  ): string {
    return DefaultMcpToolNamePrefixGenerator.stableStringify({
      clientInfo,
      serverInfo,
      tool,
    });
  }

  private static stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, currentValue) => {
      if (
        currentValue != null &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue)
      ) {
        return Object.keys(currentValue as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = (currentValue as Record<string, unknown>)[key];
            return result;
          }, {});
      }

      return currentValue;
    }) as string;
  }
}
