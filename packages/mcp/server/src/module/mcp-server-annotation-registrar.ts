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

import type { OnModuleInit } from "@nestjs/common";
import type { McpServer } from "@modelcontextprotocol/server";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import {
  McpPromptProvider,
  McpResourceProvider,
  McpToolProvider,
} from "@nestjs-ai/mcp-annotations";
import type { ToolRegistration } from "@nestjs-ai/mcp-annotations";
import type { ToolCallback, ToolCallbackProvider } from "@nestjs-ai/model";
import type { McpServerModuleOptions } from "./mcp-server-module.options.js";
import { ToolCallbackUtils } from "./tool-callback-utils.js";
import { McpServerToolUtils } from "./mcp-server-tool-utils.js";

export class McpServerAnnotationRegistrar implements OnModuleInit {
  private registered = false;

  constructor(
    private readonly mcpServer: McpServer,
    private readonly options: McpServerModuleOptions,
    private readonly toolCallbacks?: ToolCallback[] | null,
    private readonly toolCallbackProviders?: ToolCallbackProvider[] | null,
    private readonly providerInstanceExplorer?: ProviderInstanceExplorer,
  ) {}

  onModuleInit(): void {
    if (this.registered) {
      return;
    }

    const annotationsEnabled = this.options.annotations?.enabled ?? true;
    const toolCallbacksEnabled = this.options.toolCallbacks?.enabled ?? true;
    const providerInstances =
      this.providerInstanceExplorer?.getProviderInstances();

    if (annotationsEnabled && providerInstances != null) {
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
    toolObjects: object[] | undefined,
    annotationsEnabled: boolean,
    toolCallbacksEnabled: boolean,
  ): void {
    const registrations: ToolRegistration[] = [];

    if (annotationsEnabled && toolObjects != null) {
      const toolProvider = new McpToolProvider({
        toolObjects,
        mcpServer: this.mcpServer,
      });

      registrations.push(...toolProvider.getToolRegistrations());
    }

    if (toolCallbacksEnabled) {
      registrations.push(...this.getToolCallbackRegistrations());
    }

    for (const [
      name,
      config,
      callback,
    ] of McpServerToolUtils.deduplicateRegistrations(registrations)) {
      this.mcpServer.registerTool(name, config, callback as never);
    }
  }

  private getToolCallbackRegistrations(): ToolRegistration[] {
    const toolCallbacks = ToolCallbackUtils.aggregateToolCallbacks({
      toolCallbacks: this.toolCallbacks ?? [],
      toolCallbackProviders: this.toolCallbackProviders ?? [],
      exposeMcpClientTools:
        this.options.toolCallbacks?.exposeMcpClientTools ?? false,
    });

    return McpServerToolUtils.toToolRegistrations(
      this.mcpServer,
      toolCallbacks,
    );
  }
}
