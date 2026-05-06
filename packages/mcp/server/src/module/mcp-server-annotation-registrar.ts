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
import { McpPromptProvider } from "@nestjs-ai/mcp-annotations";
import type { McpServerModuleOptions } from "./mcp-server-module.options.js";
import {
  MCP_SERVER_TOKEN,
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
} from "./mcp-server.tokens.js";

@Injectable()
export class McpServerAnnotationRegistrar implements OnModuleInit {
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

    if (this.options.annotations?.prompts ?? true) {
      this.registerPrompts();
    }

    this.registered = true;
  }

  private registerPrompts(): void {
    const promptObjects = this.providerInstanceExplorer.getProviderInstances();
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
}
