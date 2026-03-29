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
  ClientCapabilities,
  Implementation,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { describe, expect, it, vi } from "vitest";
import { DefaultMcpToolNamePrefixGenerator } from "../default-mcp-tool-name-prefix-generator";
import type { McpConnectionInfo } from "../mcp-connection-info";
import { McpToolCallbackProvider } from "../mcp-tool-callback-provider";
import type { McpToolFilter } from "../mcp-tool-filter";
import { DefaultMcpToolFilter } from "../mcp-tool-filter";
import type { McpToolNamePrefixGenerator } from "../mcp-tool-name-prefix-generator";

function createTool(
  name: string,
  description = "Test tool description",
): McpTool {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {},
    },
  };
}

function createMockClient(clientName: string, toolName: string): McpClient {
  const client = {
    getServerVersion: vi
      .fn()
      .mockReturnValue({ name: "server", version: "1.0.0" }),
    listTools: vi.fn(),
    _clientInfo: { name: clientName, version: "1.0.0" } as Implementation,
    _capabilities: {} as ClientCapabilities,
  };

  const tool = createTool(toolName);
  vi.mocked(client.listTools).mockResolvedValue({ tools: [tool] } as never);

  return client as unknown as McpClient;
}

describe("McpToolCallbackProviderBuilder", () => {
  it("builder should create instance with single client", async () => {
    const mcpClient = createMockClient("test-client", "test-tool");

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(mcpClient)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("test_tool");
  });

  it("builder should create instance with multiple clients", async () => {
    const client1 = createMockClient("client1", "tool1");
    const client2 = createMockClient("client2", "tool2");

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client1)
      .addMcpClient(client2)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(2);
    expect(callbacks[0].toolDefinition.name).toBe("tool1");
    expect(callbacks[1].toolDefinition.name).toBe("tool2");
  });

  it("builder should create instance with client list", async () => {
    const client1 = createMockClient("client1", "tool1");
    const client2 = createMockClient("client2", "tool2");
    const clients = [client1, client2];

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(clients)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(2);
  });

  it("builder should create instance with client array", async () => {
    const client1 = createMockClient("client1", "tool1");
    const client2 = createMockClient("client2", "tool2");

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(client1, client2)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(2);
  });

  it("builder should create instance with custom tool filter", async () => {
    const client = createMockClient("client", "filtered-tool");
    const customFilter: McpToolFilter =
      new (class extends DefaultMcpToolFilter {
        override test(
          _connectionInfo: McpConnectionInfo,
          tool: McpTool,
        ): boolean {
          return tool.name.startsWith("filtered");
        }
      })();

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client)
      .toolFilter(customFilter)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("filtered_tool");
  });

  it("builder should create instance with custom tool name prefix generator", async () => {
    const client = createMockClient("client", "tool");
    const customGenerator: McpToolNamePrefixGenerator = {
      prefixedToolName: (_connectionInfo, tool) => `custom_${tool.name}`,
    };

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client)
      .toolNamePrefixGenerator(customGenerator)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("custom_tool");
  });

  it("builder should create instance with all custom parameters", async () => {
    const client = createMockClient("client", "custom-tool");
    const customFilter: McpToolFilter =
      new (class extends DefaultMcpToolFilter {
        override test(
          _connectionInfo: McpConnectionInfo,
          tool: McpTool,
        ): boolean {
          return tool.name.includes("custom");
        }
      })();
    const customGenerator: McpToolNamePrefixGenerator = {
      prefixedToolName: (_connectionInfo, tool) => `prefix_${tool.name}`,
    };

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client)
      .toolFilter(customFilter)
      .toolNamePrefixGenerator(customGenerator)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("prefix_custom-tool");
  });

  it("builder should throw exception when client list is null", () => {
    expect(() =>
      McpToolCallbackProvider.builder().mcpClients([null as never]),
    ).toThrow("MCP clients list must not contain null elements");
  });

  it("builder should throw exception when client array is null", () => {
    expect(() =>
      McpToolCallbackProvider.builder().mcpClients(null as never),
    ).toThrow("MCP clients array must not contain null elements");
  });

  it("builder should throw exception when adding null client", () => {
    expect(() =>
      McpToolCallbackProvider.builder().addMcpClient(null as never),
    ).toThrow("MCP client must not be null");
  });

  it("builder should throw exception when tool filter is null", () => {
    const client = createMockClient("client", "tool");

    expect(() =>
      McpToolCallbackProvider.builder()
        .addMcpClient(client)
        .toolFilter(null as never),
    ).toThrow("Tool filter must not be null");
  });

  it("builder should throw exception when tool name prefix generator is null", () => {
    const client = createMockClient("client", "tool");

    expect(() =>
      McpToolCallbackProvider.builder()
        .addMcpClient(client)
        .toolNamePrefixGenerator(null as never),
    ).toThrow("Tool name prefix generator must not be null");
  });

  it("builder should support method chaining", async () => {
    const client1 = createMockClient("client1", "tool1");
    const client2 = createMockClient("client2", "tool2");
    const filter: McpToolFilter = new DefaultMcpToolFilter();
    const generator: McpToolNamePrefixGenerator =
      new DefaultMcpToolNamePrefixGenerator();

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client1)
      .addMcpClient(client2)
      .toolFilter(filter)
      .toolNamePrefixGenerator(generator)
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(2);
  });

  it("builder should replace clients when setting new list", async () => {
    const client1 = createMockClient("client1", "tool1");
    const client2 = createMockClient("client2", "tool2");
    const client3 = createMockClient("client3", "tool3");

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(client1)
      // This should replace client1
      .mcpClients([client2, client3])
      .build();

    expect(provider).not.toBeNull();
    const callbacks = await provider.getToolCallbacks();
    expect(callbacks).toHaveLength(2);
    expect(callbacks[0].toolDefinition.name).toBe("tool2");
    expect(callbacks[1].toolDefinition.name).toBe("tool3");
  });
});
