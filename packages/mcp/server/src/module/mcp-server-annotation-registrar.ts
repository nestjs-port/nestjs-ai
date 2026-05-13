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

import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import type { McpServer } from "@modelcontextprotocol/server";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { LoggerFactory } from "@nestjs-port/core";
import {
  McpPromptProvider,
  McpResourceProvider,
  McpToolProvider,
} from "@nestjs-ai/mcp-annotations";
import type { ToolRegistration } from "@nestjs-ai/mcp-annotations";
import type { ToolCallbackProvider } from "@nestjs-ai/model";
import type { McpServerModuleOptions } from "./mcp-server-module.options.js";
import {
  MCP_SERVER_TOKEN,
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
} from "./mcp-server.tokens.js";
import { ToolCallbackUtils } from "./tool-callback-utils.js";
import { McpServerToolUtils } from "./mcp-server-tool-utils.js";

@Injectable()
export class McpServerAnnotationRegistrar implements OnModuleInit {
  private readonly logger = LoggerFactory.getLogger(
    McpServerAnnotationRegistrar.name,
  );

  private registered = false;

  constructor(
    @Inject(MCP_SERVER_TOKEN)
    private readonly mcpServer: McpServer,
    @Inject(MCP_SERVER_MODULE_OPTIONS_TOKEN)
    private readonly options: McpServerModuleOptions,
    @Inject(PROVIDER_INSTANCE_EXPLORER_TOKEN)
    private readonly providerInstanceExplorer: ProviderInstanceExplorer,
  ) {}

  onModuleInit(): void {
    if (this.registered) {
      return;
    }

    const providerInstances =
      this.providerInstanceExplorer.getProviderInstances();
    const annotationsEnabled = this.options.annotations?.enabled ?? true;
    const toolCallbacksEnabled = this.options.toolCallbacks?.enabled ?? true;

    if (annotationsEnabled) {
      this.registerPrompts(providerInstances);
      this.registerResources(providerInstances);
    }

    if (annotationsEnabled || toolCallbacksEnabled) {
      this.registerTools(
        providerInstances,
        annotationsEnabled,
        toolCallbacksEnabled,
      );
    }

    this.registered = true;
  }

  private registerPrompts(promptObjects: object[]): void {
    const promptProvider = new McpPromptProvider({
      promptObjects,
      mcpServer: this.mcpServer,
    });

    for (const [
      name,
      config,
      callback,
    ] of promptProvider.getPromptRegistrations()) {
      this.mcpServer.registerPrompt(
        name,
        config,
        callback as Parameters<McpServer["registerPrompt"]>[2],
      );
    }
  }

  private registerResources(resourceObjects: object[]): void {
    const resourceProvider = new McpResourceProvider({
      resourceObjects,
      mcpServer: this.mcpServer,
    });

    for (const [
      name,
      uriOrTemplate,
      config,
      callback,
    ] of resourceProvider.getResourceRegistrations()) {
      if (typeof uriOrTemplate === "string") {
        this.mcpServer.registerResource(
          name,
          uriOrTemplate,
          config,
          callback as never,
        );
        continue;
      }

      this.mcpServer.registerResource(
        name,
        uriOrTemplate,
        config,
        callback as never,
      );
    }
  }

  private registerTools(
    toolObjects: object[],
    annotationsEnabled: boolean,
    toolCallbacksEnabled: boolean,
  ): void {
    const registrations: ToolRegistration[] = [];

    if (annotationsEnabled) {
      const toolProvider = new McpToolProvider({
        toolObjects,
        mcpServer: this.mcpServer,
      });

      registrations.push(...toolProvider.getToolRegistrations());
    }

    if (toolCallbacksEnabled) {
      registrations.push(...this.getToolCallbackRegistrations(toolObjects));
    }

    for (const [
      name,
      config,
      callback,
    ] of McpServerToolUtils.deduplicateRegistrations(registrations)) {
      this.mcpServer.registerTool(name, config, callback as never);
    }
  }

  private getToolCallbackRegistrations(
    toolObjects: object[],
  ): ToolRegistration[] {
    const toolCallbackProviders = toolObjects.filter(
      (toolObject): toolObject is ToolCallbackProvider =>
        this.isToolCallbackProvider(toolObject),
    );

    const toolCallbacks = ToolCallbackUtils.aggregateToolCallbacks({
      toolCallbacks: [],
      toolCallbackProviders,
      includeMcpTools: this.options.toolCallbacks?.includeMcpTools ?? false,
    });

    return McpServerToolUtils.toToolRegistrations(
      this.mcpServer,
      toolCallbacks,
    );
  }

  private isToolCallbackProvider(
    candidate: object,
  ): candidate is ToolCallbackProvider {
    try {
      const toolCallbacks = (candidate as ToolCallbackProvider).toolCallbacks;
      return Array.isArray(toolCallbacks);
    } catch {
      return false;
    }
  }
}
