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
  CallToolRequest,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import type { ToolContext, ToolDefinition } from "@nestjs-ai/model";
import { ToolCallback, ToolExecutionException } from "@nestjs-ai/model";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-port/core";
import { McpToolUtils } from "./mcp-tool-utils";

export class McpToolCallback extends ToolCallback {
  private readonly _logger: Logger = LoggerFactory.getLogger(
    McpToolCallback.name,
  );

  constructor(
    private readonly _mcpClient: McpClient,
    private readonly _tool: McpTool,
    private readonly _prefixedToolName: string,
  ) {
    super();
    assert(_mcpClient != null, "MCP client must not be null");
    assert(_tool != null, "MCP tool must not be null");
    assert(
      StringUtils.hasText(_prefixedToolName),
      "Prefixed tool name must not be empty",
    );
  }

  override get toolDefinition(): ToolDefinition {
    return McpToolUtils.createToolDefinition(
      this._prefixedToolName,
      this._tool,
    );
  }

  /**
   * Creates a builder for constructing `McpToolCallback` instances.
   *
   * @returns a new builder
   */
  static builder(): McpToolCallbackBuilder {
    return new McpToolCallbackBuilder();
  }

  /**
   * Returns the original MCP tool name without prefixing.
   *
   * @returns the original tool name
   */
  get originalToolName(): string {
    return this._tool.name;
  }

  override async call(toolInput: string): Promise<string>;
  override async call(
    toolInput: string,
    toolContext: ToolContext | null,
  ): Promise<string>;
  override async call(
    toolInput: string,
    toolContext: ToolContext | null = null,
  ): Promise<string> {
    // Handle the possible null parameter situation in streaming mode.
    if (!StringUtils.hasText(toolInput)) {
      this._logger.warn(
        "Tool call arguments are null or empty for MCP tool: {}. Using empty JSON object as default.",
        this._tool.name,
      );
      toolInput = "{}";
    }

    try {
      const request: CallToolRequest["params"] = {
        // Use the original tool name, not the prefixed one from toolDefinition.
        name: this._tool.name,
        arguments: JSON.parse(toolInput) as Record<string, unknown>,
        _meta: toolContext != null ? { ...toolContext.context } : undefined,
      };

      // Note that we use the original tool name here, not the adapted one from
      // toolDefinition.
      const response = await this._mcpClient.callTool(request);

      if (response.isError === true) {
        this._logger.error("Error calling tool: {}", response.content);
        throw new ToolExecutionException(
          this.toolDefinition,
          new Error(`Error calling tool: ${JSON.stringify(response.content)}`),
        );
      }

      return JSON.stringify(response.content);
    } catch (error) {
      if (error instanceof ToolExecutionException) {
        throw error;
      }

      this._logger.error("Exception while tool calling: ", error);
      throw new ToolExecutionException(
        this.toolDefinition,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}

export class McpToolCallbackBuilder {
  private _mcpClient: McpClient | null = null;

  private _tool: McpTool | null = null;

  private _prefixedToolName: string | null = null;

  /**
   * Sets the MCP client for tool execution.
   *
   * @param mcpClient the MCP client
   * @returns this builder
   */
  mcpClient(mcpClient: McpClient): this {
    assert(mcpClient != null, "MCP client must not be null");
    this._mcpClient = mcpClient;
    return this;
  }

  /**
   * Sets the MCP tool to adapt.
   *
   * @param tool the MCP tool
   * @returns this builder
   */
  tool(tool: McpTool): this {
    assert(tool != null, "MCP tool must not be null");
    this._tool = tool;
    return this;
  }

  /**
   * Sets the prefixed tool name.
   *
   * @param prefixedToolName the prefixed tool name
   * @returns this builder
   */
  prefixedToolName(prefixedToolName: string): this {
    assert(
      StringUtils.hasText(prefixedToolName),
      "Prefixed tool name must not be null or empty",
    );
    this._prefixedToolName = prefixedToolName;
    return this;
  }

  /**
   * Builds a `McpToolCallback` with the configured parameters.
   *
   * @returns a new `McpToolCallback`
   */
  build(): McpToolCallback {
    assert(this._mcpClient != null, "MCP client must not be null");
    assert(this._tool != null, "MCP tool must not be null");

    // Apply defaults if not specified.
    return new McpToolCallback(
      this._mcpClient,
      this._tool,
      this._prefixedToolName ?? McpToolUtils.format(this._tool.name),
    );
  }
}
