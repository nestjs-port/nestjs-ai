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

import {
  Module,
  type DynamicModule,
  type Provider,
  type FactoryProvider,
} from "@nestjs/common";
import { McpClientCustomizer } from "@nestjs-ai/mcp-common";
import { McpClientAnnotationRegistrar } from "./mcp-client-annotation-registrar.js";
import type {
  McpClientModuleAsyncOptions,
  McpClientRegistration,
  McpClientModuleOptions,
} from "./mcp-client-module.options.js";
import {
  MCP_CLIENT_MODULE_OPTIONS_TOKEN,
  MCP_CLIENT_REGISTRATIONS_TOKEN,
} from "./mcp-client.tokens.js";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";

@Module({})
export class McpClientModule {
  static forRoot(
    options: McpClientModuleOptions,
    moduleOptions: {
      global?: boolean;
      customizerProvider?: Provider<McpClientCustomizer>;
    } = {},
  ): DynamicModule {
    return McpClientModule.buildDynamicModule({
      global: moduleOptions.global ?? false,
      imports: [],
      customizerProvider: moduleOptions.customizerProvider,
      moduleOptionsProvider: {
        provide: MCP_CLIENT_MODULE_OPTIONS_TOKEN,
        useValue: options,
      },
      optionsProvider: {
        provide: MCP_CLIENT_REGISTRATIONS_TOKEN,
        useValue: [],
      },
    });
  }

  static forRootAsync(options: McpClientModuleAsyncOptions): DynamicModule {
    return McpClientModule.buildDynamicModule({
      global: options.global ?? false,
      imports: options.imports ?? [],
      customizerProvider: options.customizerProvider,
      moduleOptionsProvider: {
        provide: MCP_CLIENT_MODULE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      optionsProvider: {
        provide: MCP_CLIENT_REGISTRATIONS_TOKEN,
        useValue: [],
      },
    });
  }

  private static buildDynamicModule(args: {
    global: boolean;
    imports: NonNullable<DynamicModule["imports"]>;
    customizerProvider?: Provider<McpClientCustomizer>;
    moduleOptionsProvider: Provider;
    optionsProvider: Provider;
  }): DynamicModule {
    const {
      global,
      imports,
      customizerProvider,
      moduleOptionsProvider,
      optionsProvider,
    } = args;

    return {
      module: McpClientModule,
      imports,
      providers: [
        moduleOptionsProvider,
        optionsProvider,
        ...(customizerProvider != null ? [customizerProvider] : []),
        {
          provide: McpClientAnnotationRegistrar,
          useFactory: (
            options: McpClientModuleOptions,
            clientRegistrations: McpClientRegistration[],
            providerInstanceExplorer?: ProviderInstanceExplorer,
            clientCustomizer?: McpClientCustomizer,
          ) =>
            new McpClientAnnotationRegistrar(
              options,
              clientRegistrations,
              providerInstanceExplorer,
              clientCustomizer,
            ),
          inject: [
            MCP_CLIENT_MODULE_OPTIONS_TOKEN,
            MCP_CLIENT_REGISTRATIONS_TOKEN,
            { token: PROVIDER_INSTANCE_EXPLORER_TOKEN, optional: true },
            {
              token:
                (customizerProvider as FactoryProvider)?.provide ??
                McpClientCustomizer,
              optional: true,
            },
          ],
        },
      ],
      exports: [MCP_CLIENT_REGISTRATIONS_TOKEN, McpClientAnnotationRegistrar],
      global,
    };
  }
}
