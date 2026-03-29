/*
 * Copyright 2025-present the original author or authors.
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

import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/spec.types.js";
import { describe, expect, it, vi } from "vitest";
import { McpToolCallback } from "../mcp-tool-callback";

function createTool(
  name = "test-tool",
  description = "Test tool description",
): McpTool {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" },
      },
    },
  };
}

function createClient(overrides: Partial<McpClient> = {}): McpClient {
  return {
    callTool: vi.fn(),
    listTools: vi.fn(),
    getServerVersion: vi.fn(),
    ...overrides,
  } as unknown as McpClient;
}

describe("McpToolCallbackBuilder", () => {
  it("builder should create instance with required fields", () => {
    const mcpClient = createClient();
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .build();

    expect(callback).toBeDefined();
    expect(callback.originalToolName).toBe("test-tool");
    expect(callback.toolDefinition).toBeDefined();
    expect(callback.toolDefinition.name).toBe("test_tool");
    expect(callback.toolDefinition.description).toBe("Test tool description");
  });

  it("builder should create instance with all fields", () => {
    const mcpClient = createClient();
    const tool = createTool();

    const customPrefixedName = "custom_prefix_test-tool";

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(customPrefixedName)
      .build();

    expect(callback).toBeDefined();
    expect(callback.originalToolName).toBe("test-tool");
    expect(callback.toolDefinition).toBeDefined();
    expect(callback.toolDefinition.name).toBe(customPrefixedName);
    expect(callback.toolDefinition.description).toBe("Test tool description");
  });

  it("builder should throw exception when mcp client is null", () => {
    const tool = createTool();

    expect(() => McpToolCallback.builder().tool(tool).build()).toThrow(
      "MCP client must not be null",
    );
  });

  it("builder should throw exception when tool is null", () => {
    const mcpClient = createClient();

    expect(() =>
      McpToolCallback.builder().mcpClient(mcpClient).build(),
    ).toThrow("MCP tool must not be null");
  });

  it("builder should support method chaining", () => {
    const mcpClient = createClient();
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("chained_tool_name")
      .build();

    expect(callback).toBeDefined();
    expect(callback.toolDefinition.name).toBe("chained_tool_name");
  });

  it("builder should normalize tool name with special characters", () => {
    const mcpClient = createClient();
    const tool = createTool("test-tool-with-dashes", "Test description");

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .build();

    expect(callback.originalToolName).toBe("test-tool-with-dashes");
    expect(callback.toolDefinition.name).toBe("test_tool_with_dashes");
  });

  it("builder should use custom prefixed name without normalization", () => {
    const mcpClient = createClient();
    const tool = createTool("original-name", "Test description");

    const customName = "custom-name-with-dashes";

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(customName)
      .build();

    expect(callback.originalToolName).toBe("original-name");
    expect(callback.toolDefinition.name).toBe(customName);
  });

  it("builder should handle prefixed tool name as null", () => {
    const mcpClient = createClient();
    const tool = createTool();

    expect(() =>
      McpToolCallback.builder()
        .mcpClient(mcpClient)
        .tool(tool)
        .prefixedToolName(null as unknown as string),
    ).toThrow("Prefixed tool name must not be null or empty");
  });

  it("builder should create new instances for each build", () => {
    const mcpClient = createClient();
    const tool = createTool("test-tool", "Test description");

    const builder = McpToolCallback.builder().mcpClient(mcpClient).tool(tool);

    const callback1 = builder.build();
    const callback2 = builder.build();

    expect(callback1).not.toBe(callback2);
    expect(callback1.originalToolName).toBe(callback2.originalToolName);
  });
});
