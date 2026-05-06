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

import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/server";
import { type DynamicModule, Module, type Provider } from "@nestjs/common";
import { McpServerAnnotationRegistrar } from "./mcp-server-annotation-registrar.js";
import type {
  McpServerModuleAsyncOptions,
  McpServerModuleOptions,
} from "./mcp-server-module.options.js";
import {
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
  MCP_SERVER_TOKEN,
} from "./mcp-server.tokens.js";

@Module({})
export class McpServerModule {
  static forRoot(
    options: McpServerModuleOptions,
    moduleOptions: { global?: boolean } = {},
  ): DynamicModule {
    return McpServerModule.forRootAsync({
      useFactory: () => options,
      global: moduleOptions.global,
    });
  }

  static forRootAsync(options: McpServerModuleAsyncOptions): DynamicModule {
    const providers = createProviders();

    return {
      module: McpServerModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MCP_SERVER_MODULE_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: [MCP_SERVER_TOKEN, McpServer, McpServerAnnotationRegistrar],
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: MCP_SERVER_TOKEN,
      useFactory: (options: McpServerModuleOptions) => {
        if (options.mcpServer != null) {
          return options.mcpServer;
        }

        assert(
          options.serverInfo != null,
          "serverInfo must be provided when mcpServer is not configured",
        );

        return new McpServer(options.serverInfo, options.serverOptions);
      },
      inject: [MCP_SERVER_MODULE_OPTIONS_TOKEN],
    },
    {
      provide: McpServer,
      useExisting: MCP_SERVER_TOKEN,
    },
    McpServerAnnotationRegistrar,
  ];
}
