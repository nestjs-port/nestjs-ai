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

import { describe, expect, it } from "vitest";
import { ToolCallback, type ToolCallbackProvider } from "@nestjs-ai/model";
import { McpToolCallback } from "@nestjs-ai/mcp-common";

import { ToolCallbackUtils } from "../tool-callback-utils.js";

const standardToolDefinition = {
  name: "standard-tool",
  description: "Standard tool",
  inputSchema: "{}",
} as const;

const mcpToolDefinition = {
  name: "mcp-tool",
  description: "MCP tool",
  inputSchema: "{}",
} as const;

class StandardToolCallback extends ToolCallback {
  override get toolDefinition() {
    return standardToolDefinition;
  }

  override async call(_toolInput: string): Promise<string> {
    return "standard";
  }
}

class TestMcpToolCallback extends McpToolCallback {
  constructor() {
    super(
      {
        callTool: async () => {
          throw new Error("not used");
        },
      } as any,
      mcpToolDefinition as any,
      "mcp-tool",
    );
  }
}

function createProvider(toolCallbacks: ToolCallback[]): ToolCallbackProvider {
  return {
    get toolCallbacks() {
      return toolCallbacks;
    },
  };
}

describe("ToolCallbackUtils", () => {
  it("aggregates direct callbacks and provider callbacks", () => {
    const directCallback = new StandardToolCallback();
    const providerCallback = new StandardToolCallback();
    const provider = createProvider([providerCallback]);

    const aggregated = ToolCallbackUtils.aggregateToolCallbacks({
      toolCallbacks: [directCallback],
      toolCallbackProviders: [provider],
      includeMcpTools: true,
    });

    expect(aggregated).toEqual([directCallback, providerCallback]);
  });

  it("filters MCP callbacks when includeMcpTools is false", () => {
    const directCallback = new StandardToolCallback();
    const mcpCallback = new TestMcpToolCallback();
    const provider = createProvider([mcpCallback, directCallback]);

    const aggregated = ToolCallbackUtils.aggregateToolCallbacks({
      toolCallbacks: [mcpCallback, directCallback],
      toolCallbackProviders: [provider],
      includeMcpTools: false,
    });

    expect(aggregated).toEqual([directCallback]);
  });

  it("treats providers containing MCP callbacks as MCP tool providers", () => {
    const provider = createProvider([
      new TestMcpToolCallback(),
      new StandardToolCallback(),
    ]);

    expect(ToolCallbackUtils.isMcpToolProvider(provider)).toBe(true);
  });

  it("does not treat providers without MCP callbacks as MCP tool providers", () => {
    const provider = createProvider([new StandardToolCallback()]);

    expect(ToolCallbackUtils.isMcpToolProvider(provider)).toBe(false);
  });

  it("deduplicates identical provider objects", () => {
    const providerCallback = new StandardToolCallback();
    const provider = createProvider([providerCallback]);

    const aggregated = ToolCallbackUtils.aggregateToolCallbacks({
      toolCallbacks: [],
      toolCallbackProviders: [provider, provider],
      includeMcpTools: true,
    });

    expect(aggregated).toEqual([providerCallback]);
  });
});
