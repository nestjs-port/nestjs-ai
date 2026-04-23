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
import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  ClientCapabilities,
  Implementation,
  InitializeResult,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { type ToolCallback, ToolUtils } from "@nestjs-ai/model";
import { DefaultMcpToolNamePrefixGenerator } from "./default-mcp-tool-name-prefix-generator.js";
import { McpConnectionInfo } from "./mcp-connection-info.js";
import { McpToolCallback } from "./mcp-tool-callback.js";
import { DefaultMcpToolFilter, type McpToolFilter } from "./mcp-tool-filter.js";
import type { McpToolNamePrefixGenerator } from "./mcp-tool-name-prefix-generator.js";

interface McpClientContext {
  _clientInfo?: Implementation;
  _capabilities?: ClientCapabilities;
}

function getConnectionInfo(mcpClient: McpClient): McpConnectionInfo {
  const client = mcpClient as unknown as McpClientContext;
  const serverVersion = mcpClient.getServerVersion();

  return new McpConnectionInfo({
    clientCapabilities: client._capabilities ?? ({} as ClientCapabilities),
    clientInfo:
      client._clientInfo ??
      ({ name: "mcp-client", version: "unknown" } as Implementation),
    initializeResult: serverVersion
      ? ({ serverInfo: serverVersion } as InitializeResult)
      : null,
  });
}

export class McpToolCallbackProvider {
  private readonly _mcpClients: McpClient[];

  private readonly _toolFilter: McpToolFilter;

  private readonly _toolNamePrefixGenerator: McpToolNamePrefixGenerator;

  private _invalidateCache = true;

  private _cachedToolCallbacks: ToolCallback[] = [];

  private _pendingToolCallbacks: Promise<ToolCallback[]> | null = null;

  constructor(
    mcpClients: McpClient[],
    toolFilter: McpToolFilter = new DefaultMcpToolFilter(),
    toolNamePrefixGenerator: McpToolNamePrefixGenerator = new DefaultMcpToolNamePrefixGenerator(),
  ) {
    assert(mcpClients != null, "MCP clients must not be null");
    assert(toolFilter != null, "Tool filter must not be null");
    assert(
      toolNamePrefixGenerator != null,
      "Tool name prefix generator must not be null",
    );

    this._mcpClients = [...mcpClients];
    this._toolFilter = toolFilter;
    this._toolNamePrefixGenerator = toolNamePrefixGenerator;
  }

  /**
   * Discovers and returns all available tools from configured MCP clients.
   *
   * @returns tool callbacks for discovered tools
   */
  async getToolCallbacks(): Promise<ToolCallback[]> {
    if (!this._invalidateCache) {
      return [...this._cachedToolCallbacks];
    }

    if (this._pendingToolCallbacks == null) {
      this._pendingToolCallbacks = this.buildToolCallbacks()
        .then((toolCallbacks) => {
          this.validateToolCallbacks(toolCallbacks);
          this._cachedToolCallbacks = toolCallbacks;
          this._invalidateCache = false;
          return toolCallbacks;
        })
        .finally(() => {
          this._pendingToolCallbacks = null;
        });
    }

    return [...(await this._pendingToolCallbacks)];
  }

  /**
   * Invalidates the cached tool callbacks so they will be rediscovered.
   */
  invalidateCache(): void {
    this._invalidateCache = true;
  }

  /**
   * Creates tool callbacks for the given MCP clients.
   *
   * @param mcpClients MCP clients for tool discovery
   * @returns tool callbacks for discovered tools
   */
  static async toolCallbacks(mcpClients: McpClient[]): Promise<ToolCallback[]> {
    if (mcpClients == null || mcpClients.length === 0) {
      return [];
    }

    return new McpToolCallbackProvider(mcpClients).getToolCallbacks();
  }

  /**
   * Creates a builder for constructing provider instances.
   *
   * @returns a new builder
   */
  static builder(): McpToolCallbackProviderBuilder {
    return new McpToolCallbackProviderBuilder();
  }

  private async buildToolCallbacks(): Promise<ToolCallback[]> {
    const toolCallbacks: ToolCallback[] = [];

    for (const mcpClient of this._mcpClients) {
      const connectionInfo = getConnectionInfo(mcpClient);
      const listToolsResult = await mcpClient.listTools();

      for (const tool of listToolsResult.tools) {
        if (!this._toolFilter.test(connectionInfo, tool)) {
          continue;
        }

        toolCallbacks.push(
          new McpToolCallback(
            mcpClient,
            tool,
            this._toolNamePrefixGenerator.prefixedToolName(
              connectionInfo,
              tool,
            ),
          ),
        );
      }
    }

    return toolCallbacks;
  }

  private validateToolCallbacks(toolCallbacks: ToolCallback[]): void {
    const duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
    if (duplicateToolNames.length > 0) {
      throw new Error(
        `Multiple tools with the same name (${duplicateToolNames.join(", ")})`,
      );
    }
  }
}

export class McpToolCallbackProviderBuilder {
  private _mcpClients: McpClient[] = [];

  private _toolFilter: McpToolFilter = new DefaultMcpToolFilter();

  private _toolNamePrefixGenerator: McpToolNamePrefixGenerator =
    new DefaultMcpToolNamePrefixGenerator();

  /**
   * Sets the MCP clients to discover tools from.
   *
   * @param mcpClients MCP clients to discover tools from
   * @returns this builder
   */
  mcpClients(mcpClients: McpClient[]): this;
  mcpClients(...mcpClients: McpClient[]): this;
  mcpClients(...mcpClients: McpClient[] | [McpClient[]]): this {
    assert(mcpClients != null, "MCP clients list must not be null");
    if (mcpClients.length === 1 && Array.isArray(mcpClients[0])) {
      assert(
        (mcpClients[0] as McpClient[]).every((mcpClient) => mcpClient != null),
        "MCP clients list must not contain null elements",
      );
      this._mcpClients = [...(mcpClients[0] as McpClient[])];
      return this;
    }

    assert(
      (mcpClients as McpClient[]).every((mcpClient) => mcpClient != null),
      "MCP clients array must not contain null elements",
    );
    this._mcpClients = [...(mcpClients as McpClient[])];
    return this;
  }

  /**
   * Adds a single MCP client to the discovery set.
   *
   * @param mcpClient the MCP client to add
   * @returns this builder
   */
  addMcpClient(mcpClient: McpClient): this {
    assert(mcpClient != null, "MCP client must not be null");
    this._mcpClients.push(mcpClient);
    return this;
  }

  /**
   * Sets the tool filter.
   *
   * @param toolFilter the tool filter
   * @returns this builder
   */
  toolFilter(toolFilter: McpToolFilter): this {
    assert(toolFilter != null, "Tool filter must not be null");
    this._toolFilter = toolFilter;
    return this;
  }

  /**
   * Sets the tool name prefix generator.
   *
   * @param toolNamePrefixGenerator the tool name prefix generator
   * @returns this builder
   */
  toolNamePrefixGenerator(
    toolNamePrefixGenerator: McpToolNamePrefixGenerator,
  ): this {
    assert(
      toolNamePrefixGenerator != null,
      "Tool name prefix generator must not be null",
    );
    this._toolNamePrefixGenerator = toolNamePrefixGenerator;
    return this;
  }

  /**
   * Builds a provider with the configured parameters.
   *
   * @returns a new provider
   */
  build(): McpToolCallbackProvider {
    return new McpToolCallbackProvider(
      this._mcpClients,
      this._toolFilter,
      this._toolNamePrefixGenerator,
    );
  }
}
