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
import {
  type DynamicModule,
  Module,
  type Provider,
  type Type,
} from "@nestjs/common";
import { McpServerStdioService } from "../transport/index.js";
import { createStreamableHttpController } from "../transport/index.js";
import { McpServerStreamableHttpService } from "../transport/index.js";
import { McpServerAnnotationRegistrar } from "./mcp-server-annotation-registrar.js";
import {
  DEFAULT_STREAMABLE_HTTP_ENDPOINT,
  type McpServerModuleAsyncOptions,
  type McpServerModuleOptions,
  type McpServerModuleSyncTransportOptions,
  type McpServerTransportType,
} from "./mcp-server-module.options.js";
import {
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
  MCP_SERVER_STREAMABLE_HTTP_ENDPOINT_TOKEN,
  MCP_SERVER_TOKEN,
  MCP_SERVER_TRANSPORT_TYPE_TOKEN,
} from "./mcp-server.tokens.js";

const DEFAULT_TRANSPORT: McpServerTransportType = "streamable-http";

@Module({})
export class McpServerModule {
  static forRoot(
    options: McpServerModuleOptions & McpServerModuleSyncTransportOptions,
    moduleOptions: { global?: boolean } = {},
  ): DynamicModule {
    const transport = options.transport ?? DEFAULT_TRANSPORT;
    const endpoint = options.endpoint ?? DEFAULT_STREAMABLE_HTTP_ENDPOINT;
    const { transport: _t, endpoint: _e, ...rest } = options;
    void _t;
    void _e;

    return McpServerModule.buildDynamicModule({
      transport,
      endpoint,
      global: moduleOptions.global ?? false,
      imports: [],
      optionsProvider: {
        provide: MCP_SERVER_MODULE_OPTIONS_TOKEN,
        useValue: rest,
      },
    });
  }

  static forRootAsync(options: McpServerModuleAsyncOptions): DynamicModule {
    const transport = options.transport ?? DEFAULT_TRANSPORT;
    const endpoint = options.endpoint ?? DEFAULT_STREAMABLE_HTTP_ENDPOINT;

    return McpServerModule.buildDynamicModule({
      transport,
      endpoint,
      global: options.global ?? false,
      imports: options.imports ?? [],
      optionsProvider: {
        provide: MCP_SERVER_MODULE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    });
  }

  private static buildDynamicModule(args: {
    transport: McpServerTransportType;
    endpoint: string;
    global: boolean;
    imports: NonNullable<DynamicModule["imports"]>;
    optionsProvider: Provider;
  }): DynamicModule {
    const { transport, endpoint, global, imports, optionsProvider } = args;

    const baseProviders: Provider[] = [
      optionsProvider,
      {
        provide: MCP_SERVER_TRANSPORT_TYPE_TOKEN,
        useValue: transport,
      },
      {
        provide: MCP_SERVER_STREAMABLE_HTTP_ENDPOINT_TOKEN,
        useValue: endpoint,
      },
      ...createServerProviders(),
    ];

    const transportProviders = createTransportProviders(transport);
    const controllers = createTransportControllers(transport, endpoint);

    return {
      module: McpServerModule,
      imports,
      controllers,
      providers: [...baseProviders, ...transportProviders],
      exports: [MCP_SERVER_TOKEN, McpServer, McpServerAnnotationRegistrar],
      global,
    };
  }
}

function createServerProviders(): Provider[] {
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

function createTransportProviders(
  transport: McpServerTransportType,
): Provider[] {
  switch (transport) {
    case "stdio":
      return [McpServerStdioService];
    case "streamable-http":
      return [McpServerStreamableHttpService];
  }
}

function createTransportControllers(
  transport: McpServerTransportType,
  endpoint: string,
): Type<unknown>[] {
  if (transport === "streamable-http") {
    return [createStreamableHttpController(endpoint)];
  }
  return [];
}
