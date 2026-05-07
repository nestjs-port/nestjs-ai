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

import { Module, type DynamicModule, type Provider } from "@nestjs/common";
import { McpClientAnnotationRegistrar } from "./mcp-client-annotation-registrar.js";
import { McpClientSamplingScanner } from "./mcp-client-sampling-scanner.js";
import type {
  McpClientModuleAsyncOptions,
  McpClientModuleOptions,
} from "./mcp-client-module.options.js";
import { normalizeMcpClientRegistrations } from "./mcp-client-module.options.js";
import {
  MCP_CLIENT_MODULE_OPTIONS_TOKEN,
  MCP_CLIENT_REGISTRATIONS_TOKEN,
} from "./mcp-client.tokens.js";

@Module({})
export class McpClientModule {
  static forRoot(
    options: McpClientModuleOptions,
    moduleOptions: { global?: boolean } = {},
  ): DynamicModule {
    return McpClientModule.buildDynamicModule({
      global: moduleOptions.global ?? false,
      imports: [],
      moduleOptionsProvider: {
        provide: MCP_CLIENT_MODULE_OPTIONS_TOKEN,
        useValue: options,
      },
      optionsProvider: {
        provide: MCP_CLIENT_REGISTRATIONS_TOKEN,
        useFactory: (resolved: McpClientModuleOptions) =>
          normalizeMcpClientRegistrations(resolved),
        inject: [MCP_CLIENT_MODULE_OPTIONS_TOKEN],
      },
    });
  }

  static forRootAsync(options: McpClientModuleAsyncOptions): DynamicModule {
    return McpClientModule.buildDynamicModule({
      global: options.global ?? false,
      imports: options.imports ?? [],
      moduleOptionsProvider: {
        provide: MCP_CLIENT_MODULE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      optionsProvider: {
        provide: MCP_CLIENT_REGISTRATIONS_TOKEN,
        useFactory: (resolved: McpClientModuleOptions) =>
          normalizeMcpClientRegistrations(resolved),
        inject: [MCP_CLIENT_MODULE_OPTIONS_TOKEN],
      },
    });
  }

  private static buildDynamicModule(args: {
    global: boolean;
    imports: NonNullable<DynamicModule["imports"]>;
    moduleOptionsProvider: Provider;
    optionsProvider: Provider;
  }): DynamicModule {
    const { global, imports, moduleOptionsProvider, optionsProvider } = args;

    return {
      module: McpClientModule,
      imports,
      providers: [
        moduleOptionsProvider,
        optionsProvider,
        McpClientSamplingScanner,
        McpClientAnnotationRegistrar,
      ],
      exports: [
        MCP_CLIENT_REGISTRATIONS_TOKEN,
        McpClientAnnotationRegistrar,
        McpClientSamplingScanner,
      ],
      global,
    };
  }
}
