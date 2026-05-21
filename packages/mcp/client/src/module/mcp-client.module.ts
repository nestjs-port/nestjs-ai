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
  type FactoryProvider,
  type Provider,
} from "@nestjs/common";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import {
  McpClientCustomizer,
  McpToolCallbackEventBus,
  McpToolCallbackProvider,
  type McpToolFilter,
  type McpToolNamePrefixGenerator,
} from "@nestjs-ai/mcp-common";
import { TOOL_CALLBACK_PROVIDER_TOKEN } from "@nestjs-ai/commons";
import type { ToolCallbackProvider } from "@nestjs-ai/model";
import { McpClientAnnotationRegistrar } from "./mcp-client-annotation-registrar.js";
import type {
  McpClientModuleAsyncOptions,
  McpClientModuleOptions,
  McpClientRegistration,
} from "./mcp-client-module.options.js";
import {
  MCP_CLIENT_MODULE_OPTIONS_TOKEN,
  MCP_CLIENT_REGISTRATIONS_TOKEN,
  MCP_TOOL_FILTER_TOKEN,
  MCP_TOOL_NAME_PREFIX_GENERATOR_TOKEN,
} from "./mcp-client.tokens.js";
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
          provide: McpToolCallbackEventBus,
          useClass: McpToolCallbackEventBus,
        },
        {
          provide: McpToolCallbackProvider,
          useFactory: (
            options: McpClientModuleOptions,
            eventBus: McpToolCallbackEventBus,
            toolFilter?: McpToolFilter,
            toolNamePrefixGenerator?: McpToolNamePrefixGenerator,
            toolCallbackProviders?: ToolCallbackProvider[] | null,
          ) => {
            if (options.toolCallback?.enabled === false) {
              return null;
            }

            let providerBuilder =
              McpToolCallbackProvider.builder().eventBus(eventBus);

            if (toolFilter != null) {
              providerBuilder = providerBuilder.toolFilter(toolFilter);
            }

            if (toolNamePrefixGenerator != null) {
              providerBuilder = providerBuilder.toolNamePrefixGenerator(
                toolNamePrefixGenerator,
              );
            }

            const provider = providerBuilder.build();
            toolCallbackProviders?.push(provider);

            return provider;
          },
          inject: [
            MCP_CLIENT_MODULE_OPTIONS_TOKEN,
            McpToolCallbackEventBus,
            { token: MCP_TOOL_FILTER_TOKEN, optional: true },
            { token: MCP_TOOL_NAME_PREFIX_GENERATOR_TOKEN, optional: true },
            { token: TOOL_CALLBACK_PROVIDER_TOKEN, optional: true },
          ],
        },
        {
          provide: McpClientAnnotationRegistrar,
          useFactory: (
            options: McpClientModuleOptions,
            clientRegistrations: McpClientRegistration[],
            eventBus: McpToolCallbackEventBus,
            providerInstanceExplorer?: ProviderInstanceExplorer,
            clientCustomizer?: McpClientCustomizer,
            toolCallbackProvider?: McpToolCallbackProvider | null,
          ) =>
            new McpClientAnnotationRegistrar(
              options,
              clientRegistrations,
              eventBus,
              providerInstanceExplorer,
              clientCustomizer,
              toolCallbackProvider,
            ),
          inject: [
            MCP_CLIENT_MODULE_OPTIONS_TOKEN,
            MCP_CLIENT_REGISTRATIONS_TOKEN,
            McpToolCallbackEventBus,
            { token: PROVIDER_INSTANCE_EXPLORER_TOKEN, optional: true },
            {
              token:
                (customizerProvider as FactoryProvider)?.provide ??
                McpClientCustomizer,
              optional: true,
            },
            McpToolCallbackProvider,
          ],
        },
      ],
      exports: [
        MCP_CLIENT_REGISTRATIONS_TOKEN,
        McpClientAnnotationRegistrar,
        McpToolCallbackProvider,
        McpToolCallbackEventBus,
      ],
      global,
    };
  }
}
