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
import type {
  CallToolRequest,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { ToolContext, ToolExecutionException } from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import { McpToolCallback } from "../mcp-tool-callback.js";
import { McpToolUtils } from "../mcp-tool-utils.js";

function createTool(
  name = "testTool",
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

describe("McpToolCallback", () => {
  it("get tool definition should return correct definition", () => {
    const mcpClient = createClient();
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(
        McpToolUtils.prefixedToolName("testClient", null, tool.name),
      )
      .build();

    const toolDefinition = callback.toolDefinition;

    expect(toolDefinition.name).toBe("t_testTool");
    expect(toolDefinition.description).toBe("Test tool description");
  });

  it("get original tool name should return correct name", () => {
    const mcpClient = createClient();
    const tool = createTool("originalToolName");

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("prefix_originalToolName")
      .build();

    expect(callback.originalToolName).toBe("originalToolName");
  });

  it("call should handle JSON input and output", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(
        McpToolUtils.prefixedToolName("testClient", "server1", tool.name),
      )
      .build();

    const response = await callback.call('{"param":"value"}');

    expect(response).toBe("[]");
    expect(mcpClient.callTool).toHaveBeenCalledWith({
      name: "testTool",
      arguments: { param: "value" },
      _meta: undefined,
    } satisfies CallToolRequest["params"]);
  });

  it("call should handle tool context", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    });
    const tool = createTool();
    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(
        McpToolUtils.prefixedToolName("testClient", "server1", tool.name),
      )
      .build();

    const response = await callback.call(
      '{"param":"value"}',
      new ToolContext({ foo: "bar" }),
    );

    expect(response).toBe("[]");
    expect(mcpClient.callTool).toHaveBeenCalledWith({
      name: "testTool",
      arguments: { param: "value" },
      _meta: { foo: "bar" },
    } satisfies CallToolRequest["params"]);
  });

  it("call should handle null or empty input", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("testClient_testTool")
      .build();

    // Test with null input
    await expect(callback.call(null as unknown as string)).resolves.toBe("[]");

    // Test with empty string input
    await expect(callback.call("")).resolves.toBe("[]");

    // Test with whitespace-only input
    await expect(callback.call("   ")).resolves.toBe("[]");
  });

  it("call should throw on error", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({
        isError: true,
        content: [{ type: "text", text: "Some error data" }],
      }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(
        McpToolUtils.prefixedToolName("testClient", "server1", tool.name),
      )
      .build();

    const rejected = callback.call('{"param":"value"}');

    await expect(rejected).rejects.toMatchObject({
      name: "ToolExecutionException",
      cause: expect.any(Error),
    });

    await expect(rejected).rejects.toThrow(
      'Error calling tool: [{"type":"text","text":"Some error data"}]',
    );
  });

  it("call should wrap exceptions", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockRejectedValue(new Error("Testing tool error")),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName(
        McpToolUtils.prefixedToolName("testClient", "server1", tool.name),
      )
      .build();

    await expect(callback.call('{"param":"value"}')).rejects.toBeInstanceOf(
      ToolExecutionException,
    );
    await expect(callback.call('{"param":"value"}')).rejects.toThrow(
      "Testing tool error",
    );
  });

  it("call should handle empty response", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({ isError: false, content: [] }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("testClient_testTool")
      .build();

    await expect(callback.call('{"param":"value"}')).resolves.toBe("[]");
  });

  it("call should handle multiple content items", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({
        isError: false,
        content: [
          { type: "text", text: "First content" },
          { type: "text", text: "Second content" },
        ],
      }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("testClient_testTool")
      .build();

    const response = await callback.call('{"param":"value"}');

    expect(response).toBe(
      '[{"type":"text","text":"First content"},{"type":"text","text":"Second content"}]',
    );
  });

  it("call should handle non text content", async () => {
    const mcpClient = createClient({
      callTool: vi.fn().mockResolvedValue({
        isError: false,
        content: [{ type: "image", data: "base64data", mimeType: "image/png" }],
      }),
    });
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .prefixedToolName("testClient_testTool")
      .build();

    const response = await callback.call('{"param":"value"}');

    expect(response).toBe(
      '[{"type":"image","data":"base64data","mimeType":"image/png"}]',
    );
  });

  it("builder should use default prefix when not specified", () => {
    const mcpClient = createClient();
    const tool = createTool();

    const callback = McpToolCallback.builder()
      .mcpClient(mcpClient)
      .tool(tool)
      .build();

    // The default prefix generator should create a prefixed name
    const toolDefinition = callback.toolDefinition;
    expect(toolDefinition.name).toContain("testTool");
  });

  it("builder should validate required parameters", () => {
    const mcpClient = createClient();
    const tool = createTool();

    // Test missing mcpClient
    expect(() => McpToolCallback.builder().tool(tool).build()).toThrow(
      "MCP client must not be null",
    );

    // Test missing tool
    expect(() =>
      McpToolCallback.builder().mcpClient(mcpClient).build(),
    ).toThrow("MCP tool must not be null");
  });
});
