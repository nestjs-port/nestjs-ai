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

import { Injectable } from "@nestjs/common";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  McpPrompt,
  McpResource,
  McpTool,
  type McpPromptMethodContext,
  type McpResourceMethodArguments,
  type McpToolMethodArguments,
} from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DefaultToolDefinition,
  ToolCallback,
  ToolMetadata,
  type ToolCallbackProvider,
} from "@nestjs-ai/model";

import { McpServerAnnotationRegistrar } from "../mcp-server-annotation-registrar.js";
import type { McpServerModuleOptions } from "../mcp-server-module.options.js";

const PROMPT_NAME = "greeting";
const RESOURCE_NAME = "profile";
const RESOURCE_URI = "profile://current";
const TOOL_NAME = "echo";
const CALLBACK_NAME = "callback";
const PROVIDER_CALLBACK_NAME = "provider-callback";

class TestToolCallback extends ToolCallback {
  constructor(
    private readonly name: string,
    private readonly description: string,
  ) {
    super();
  }

  override get toolDefinition() {
    return DefaultToolDefinition.builder()
      .name(this.name)
      .description(this.description)
      .inputSchema("{}")
      .build();
  }

  override get toolMetadata() {
    return ToolMetadata.create({});
  }

  override async call(_toolInput: string): Promise<string> {
    return this.name;
  }
}

function createToolCallbackProvider(
  toolCallbacks: ToolCallback[],
): ToolCallbackProvider {
  return {
    get toolCallbacks() {
      return toolCallbacks;
    },
  };
}

@Injectable()
class AnnotatedProvider {
  @McpPrompt({
    name: PROMPT_NAME,
    description: "Return a greeting prompt",
  })
  greeting(_ctx: McpPromptMethodContext): string {
    return "Hello from MCP";
  }

  @McpResource({
    name: RESOURCE_NAME,
    uri: RESOURCE_URI,
    description: "Return a user profile resource",
    mimeType: "text/plain",
  })
  profile(_args: McpResourceMethodArguments): string {
    return "profile";
  }

  @McpTool({
    name: TOOL_NAME,
    description: "Echo the provided value",
    title: "Echo Tool",
  })
  echo(_args: McpToolMethodArguments<{ value: string }>): string {
    return "echo";
  }
}

describe("McpServerAnnotationRegistrar", () => {
  let provider: AnnotatedProvider;
  let providerInstanceExplorer: ProviderInstanceExplorer;
  let mcpServer: McpServer;
  let options: McpServerModuleOptions;
  let toolCallbacks: ToolCallback[];
  let toolCallbackProviders: ToolCallbackProvider[];

  beforeEach(() => {
    provider = new AnnotatedProvider();
    providerInstanceExplorer = {
      getProviderInstances: vi.fn(() => [provider]),
    } as ProviderInstanceExplorer;
    mcpServer = {
      registerPrompt: vi.fn(),
      registerResource: vi.fn(),
      registerTool: vi.fn(),
    } as unknown as McpServer;
    options = {};
    toolCallbacks = [];
    toolCallbackProviders = [];
  });

  it("registers prompt, resource, and tool annotations by default", () => {
    const registrar = new McpServerAnnotationRegistrar(
      mcpServer,
      options,
      toolCallbacks,
      toolCallbackProviders,
      providerInstanceExplorer,
    );

    registrar.onModuleInit();

    expect(providerInstanceExplorer.getProviderInstances).toHaveBeenCalledTimes(
      1,
    );
    expect(mcpServer.registerPrompt).toHaveBeenCalledOnce();
    expect(mcpServer.registerPrompt).toHaveBeenCalledWith(
      PROMPT_NAME,
      expect.objectContaining({
        description: "Return a greeting prompt",
      }),
      expect.any(Function),
    );
    expect(mcpServer.registerResource).toHaveBeenCalledOnce();
    expect(mcpServer.registerResource).toHaveBeenCalledWith(
      RESOURCE_NAME,
      RESOURCE_URI,
      expect.objectContaining({
        description: "Return a user profile resource",
        mimeType: "text/plain",
      }),
      expect.any(Function),
    );
    expect(mcpServer.registerTool).toHaveBeenCalledOnce();
    expect(mcpServer.registerTool).toHaveBeenCalledWith(
      TOOL_NAME,
      expect.objectContaining({
        description: "Echo the provided value",
        title: "Echo Tool",
      }),
      expect.any(Function),
    );
  });

  it("respects annotation enabled toggle", () => {
    options = {
      annotations: {
        enabled: false,
      },
    };

    const registrar = new McpServerAnnotationRegistrar(
      mcpServer,
      options,
      toolCallbacks,
      toolCallbackProviders,
      providerInstanceExplorer,
    );

    registrar.onModuleInit();

    expect(mcpServer.registerPrompt).not.toHaveBeenCalled();
    expect(mcpServer.registerResource).not.toHaveBeenCalled();
    expect(mcpServer.registerTool).not.toHaveBeenCalled();
  });

  it("registers tool callbacks from tokens when provider explorer is absent", () => {
    const directCallback = new TestToolCallback(
      CALLBACK_NAME,
      "Direct callback",
    );
    const providerCallback = new TestToolCallback(
      PROVIDER_CALLBACK_NAME,
      "Provider callback",
    );

    const registrar = new McpServerAnnotationRegistrar(
      mcpServer,
      options,
      [directCallback],
      [createToolCallbackProvider([providerCallback])],
    );

    registrar.onModuleInit();

    expect(mcpServer.registerPrompt).not.toHaveBeenCalled();
    expect(mcpServer.registerResource).not.toHaveBeenCalled();
    expect(mcpServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mcpServer.registerTool).toHaveBeenCalledWith(
      CALLBACK_NAME,
      expect.objectContaining({
        description: "Direct callback",
      }),
      expect.any(Function),
    );
    expect(mcpServer.registerTool).toHaveBeenCalledWith(
      PROVIDER_CALLBACK_NAME,
      expect.objectContaining({
        description: "Provider callback",
      }),
      expect.any(Function),
    );
  });
});
