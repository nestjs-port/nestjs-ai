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

import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  ClientCapabilities,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { describe, expect, it, vi } from "vitest";
import { DefaultMcpToolNamePrefixGenerator } from "../default-mcp-tool-name-prefix-generator.js";
import type { McpConnectionInfo } from "../mcp-connection-info.js";
import { McpToolCallbackProvider } from "../mcp-tool-callback-provider.js";
import { McpToolFilter } from "../mcp-tool-filter.js";
import { McpToolNamePrefixGenerator } from "../mcp-tool-name-prefix-generator.js";

function createTool(name: string): McpTool {
  return {
    name,
    inputSchema: {
      type: "object",
      properties: {},
    },
  } as McpTool;
}

function createClient(overrides: Record<string, unknown> = {}): McpClient {
  const client = {
    getServerVersion: vi.fn(),
    listTools: vi.fn(),
    ...overrides,
  };

  return client as unknown as McpClient;
}

describe("McpToolCallbackProvider", () => {
  it("get tool callbacks should return empty array when no tools", async () => {
    const mcpClient = createClient({
      _clientInfo: { name: "testClient", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
    });

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(mcpClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(0);
  });

  it("get tool callbacks should return empty array when no clients", async () => {
    const provider = McpToolCallbackProvider.builder().build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(0);
  });

  it("get tool callbacks should return callbacks for each tool", async () => {
    const clientInfo = { name: "testClient", version: "1.0.0" };
    const clientCapabilities = {} as ClientCapabilities;
    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");

    const mcpClient = createClient({
      _clientInfo: clientInfo,
      _capabilities: clientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2] }),
    });

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(mcpClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(2);
  });

  it("get tool callbacks should throw exception for duplicate tool names", async () => {
    const clientInfo = { name: "testClient", version: "1.0.0" };
    const clientCapabilities = {} as ClientCapabilities;
    const tool1 = createTool("sameName");
    const tool2 = createTool("sameName");

    const mcpClient = createClient({
      _clientInfo: clientInfo,
      _capabilities: clientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2] }),
    });

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(mcpClient)
      .build();

    await expect(provider.getToolCallbacks()).rejects.toThrow(
      "Multiple tools with the same name",
    );

    const provider2 = McpToolCallbackProvider.builder()
      .toolNamePrefixGenerator(McpToolNamePrefixGenerator.noPrefix())
      .mcpClients(mcpClient)
      .build();

    await expect(provider2.getToolCallbacks()).rejects.toThrow(
      "Multiple tools with the same name",
    );
  });

  it("same name tools but different client info names should produce different tool callback names", async () => {
    const tool1 = createTool("sameName");
    const tool2 = createTool("sameName");

    const mcpClient1 = createClient({
      _clientInfo: { name: "FirstClient", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1] }),
    });

    const mcpClient2 = createClient({
      _clientInfo: { name: "SecondClient", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool2] }),
    });

    const provider = McpToolCallbackProvider.builder()
      .mcpClients(mcpClient1, mcpClient2)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(2);
    expect(callbacks[0].toolDefinition.name).toBe("sameName");
    expect(callbacks[1].toolDefinition.name).toBe("alt_1_sameName");
  });

  it("tool filter should accept all tools by default", async () => {
    const clientInfo = { name: "testClient", version: "1.0.0" };
    const clientCapabilities = {} as ClientCapabilities;
    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");

    const mcpClient = createClient({
      _clientInfo: clientInfo,
      _capabilities: clientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2] }),
    });

    // Using the builder without explicit filter (should use default filter that
    // accepts all)
    const provider = McpToolCallbackProvider.builder()
      .mcpClients(mcpClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(2);
  });

  it("tool filter should reject all tools when configured", async () => {
    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");

    const mcpClient = createClient({
      _clientInfo: { name: "testClient", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2] }),
    });

    // Create a filter that rejects all tools
    const rejectAllFilter = new (class extends McpToolFilter {
      override test(): boolean {
        return false;
      }
    })();

    const provider = McpToolCallbackProvider.builder()
      .toolFilter(rejectAllFilter)
      .toolNamePrefixGenerator(new DefaultMcpToolNamePrefixGenerator())
      .mcpClients(mcpClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(0);
  });

  it("tool filter should filter tools by name when configured", async () => {
    const clientInfo = { name: "testClient", version: "1.0.0" };
    const clientCapabilities = {} as ClientCapabilities;
    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");
    const tool3 = createTool("tool3");

    const mcpClient = createClient({
      _clientInfo: clientInfo,
      _capabilities: clientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2, tool3] }),
    });

    // Create a filter that only accepts tools with names containing "2" or "3"
    const nameFilter = new (class extends McpToolFilter {
      override test(
        _connectionInfo: McpConnectionInfo,
        tool: McpTool,
      ): boolean {
        return tool.name.includes("2") || tool.name.includes("3");
      }
    })();

    const provider = McpToolCallbackProvider.builder()
      .toolFilter(nameFilter)
      .toolNamePrefixGenerator(new DefaultMcpToolNamePrefixGenerator())
      .mcpClients(mcpClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(2);
    expect(callbacks[0].toolDefinition.name).toBe("tool2");
    expect(callbacks[1].toolDefinition.name).toBe("tool3");
  });

  it("tool filter should filter tools by client when configured", async () => {
    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");

    const mcpClient1 = createClient({
      _clientInfo: { name: "testClient1", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1] }),
    });

    const mcpClient2 = createClient({
      _clientInfo: { name: "testClient2", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool2] }),
    });

    // Create a filter that only accepts tools from client1
    const clientFilter = new (class extends McpToolFilter {
      override test(connectionInfo: McpConnectionInfo): boolean {
        return connectionInfo.clientInfo.name === "testClient1";
      }
    })();

    const provider = McpToolCallbackProvider.builder()
      .toolFilter(clientFilter)
      .toolNamePrefixGenerator(new DefaultMcpToolNamePrefixGenerator())
      .mcpClients(mcpClient1, mcpClient2)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("tool1");
  });

  it("tool filter should combine client and tool criteria when configured", async () => {
    const tool1 = createTool("weather");
    const tool2 = createTool("calculator");

    const weatherClient = createClient({
      _clientInfo: { name: "weather-service", version: "1.0.0" },
      _capabilities: {} as ClientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1, tool2] }),
    });

    // Create a filter that only accepts weather tools from the weather service
    const complexFilter = new (class extends McpToolFilter {
      override test(
        connectionInfo: { clientInfo: { name: string } },
        tool: McpTool,
      ): boolean {
        return (
          connectionInfo.clientInfo.name === "weather-service" &&
          tool.name === "weather"
        );
      }
    })();

    const provider = McpToolCallbackProvider.builder()
      .toolFilter(complexFilter)
      .toolNamePrefixGenerator(new DefaultMcpToolNamePrefixGenerator())
      .mcpClients(weatherClient)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("weather");
  });

  it("builder should support add mcp client", async () => {
    const clientInfo1 = { name: "testClient1", version: "1.0.0" };
    const clientCapabilities1 = {} as ClientCapabilities;
    const clientInfo2 = { name: "testClient2", version: "1.0.0" };
    const clientCapabilities2 = {} as ClientCapabilities;

    const tool1 = createTool("tool1");
    const tool2 = createTool("tool2");

    const mcpClient1 = createClient({
      _clientInfo: clientInfo1,
      _capabilities: clientCapabilities1,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1] }),
    });

    const mcpClient2 = createClient({
      _clientInfo: clientInfo2,
      _capabilities: clientCapabilities2,
      listTools: vi.fn().mockResolvedValue({ tools: [tool2] }),
    });

    const provider = McpToolCallbackProvider.builder()
      .addMcpClient(mcpClient1)
      .addMcpClient(mcpClient2)
      .build();

    const callbacks = await provider.getToolCallbacks();

    expect(callbacks).toHaveLength(2);
  });

  it("sync tool callbacks static method should return empty list when no clients", async () => {
    const callbacks = await McpToolCallbackProvider.toolCallbacks([]);

    expect(callbacks).toHaveLength(0);
  });

  it("sync tool callbacks static method should return empty list when null clients", async () => {
    const callbacks = await McpToolCallbackProvider.toolCallbacks(
      null as unknown as McpClient[],
    );

    expect(callbacks).toHaveLength(0);
  });

  it("sync tool callbacks static method should return callbacks", async () => {
    const clientInfo = { name: "testClient", version: "1.0.0" };
    const clientCapabilities = {} as ClientCapabilities;
    const tool1 = createTool("tool1");

    const mcpClient = createClient({
      _clientInfo: clientInfo,
      _capabilities: clientCapabilities,
      listTools: vi.fn().mockResolvedValue({ tools: [tool1] }),
    });

    const callbacks = await McpToolCallbackProvider.toolCallbacks([mcpClient]);

    expect(callbacks).toHaveLength(1);
  });
});
