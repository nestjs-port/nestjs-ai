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

import type { Tool } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpToolListChanged } from "../../../../mcp-tool-list-changed.js";
import { McpToolListChangedProvider } from "../mcp-tool-list-changed-provider.js";

describe("McpToolListChangedProvider", () => {
  const TEST_TOOLS: Tool[] = [
    {
      name: "test-tool-1",
      description: "Test Tool 1",
      inputSchema: {},
    } as Tool,
    {
      name: "test-tool-2",
      description: "Test Tool 2",
      inputSchema: {},
    } as Tool,
  ];

  it("testGetToolListChangedSpecifications", async () => {
    const handler = new ToolListChangedHandler();
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [handler],
    });

    const specifications = provider.getToolListChangedSpecifications();
    const consumers = specifications.map((spec) => spec.toolListChangeHandler);

    expect(consumers).toHaveLength(2);
    expect(specifications).toHaveLength(2);

    await consumers[0]?.(TEST_TOOLS);

    expect(handler.lastUpdatedTools).toEqual(TEST_TOOLS);
    expect(handler.lastUpdatedTools).toHaveLength(2);
    expect(handler.lastUpdatedTools?.[0]?.name).toBe("test-tool-1");
    expect(handler.lastUpdatedTools?.[1]?.name).toBe("test-tool-2");

    await consumers[1]?.(TEST_TOOLS);

    expect(handler.lastUpdatedTools).toEqual(TEST_TOOLS);
  });

  it("testClientIdSpecifications", () => {
    const handler = new ToolListChangedHandler();
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [handler],
    });

    const specifications = provider.getToolListChangedSpecifications();

    expect(specifications).toHaveLength(2);
    expect(specifications.map((spec) => spec.clients).flat()).toEqual(
      expect.arrayContaining(["client1", "test-client"]),
    );
  });

  it("testEmptyList", () => {
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [],
    });

    expect(provider.getToolListChangedSpecifications()).toHaveLength(0);
  });

  it("testMultipleObjects", () => {
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [
        new ToolListChangedHandler(),
        new ToolListChangedHandler(),
      ],
    });

    expect(provider.getToolListChangedSpecifications()).toHaveLength(4);
  });

  it("testConsumerFunctionality", async () => {
    const handler = new ToolListChangedHandler();
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [handler],
    });

    const consumer =
      provider.getToolListChangedSpecifications()[0]?.toolListChangeHandler;
    expect(consumer).toBeDefined();

    const emptyList: Tool[] = [];
    await consumer?.(emptyList);
    expect(handler.lastUpdatedTools).toEqual(emptyList);
    expect(handler.lastUpdatedTools).toHaveLength(0);

    await consumer?.(TEST_TOOLS);
    expect(handler.lastUpdatedTools).toEqual(TEST_TOOLS);
    expect(handler.lastUpdatedTools).toHaveLength(2);
  });

  it("testNonAnnotatedMethodsIgnored", () => {
    const handler = new ToolListChangedHandler();
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [handler],
    });

    expect(provider.getToolListChangedSpecifications()).toHaveLength(2);
  });
});

class ToolListChangedHandler {
  public lastUpdatedTools: Tool[] | null = null;

  @McpToolListChanged({ clients: ["client1"] })
  public handleToolListChanged(updatedTools: Tool[]): void {
    this.lastUpdatedTools = updatedTools;
  }

  @McpToolListChanged({ clients: ["test-client"] })
  public handleToolListChangedWithClientId(updatedTools: Tool[]): void {
    this.lastUpdatedTools = updatedTools;
  }

  public notAnnotatedMethod(_updatedTools: Tool[]): void {
    // This method should be ignored
  }
}
