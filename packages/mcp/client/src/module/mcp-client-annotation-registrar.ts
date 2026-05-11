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
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  Client as McpClient,
  type ListChangedHandlers,
  type ListChangedOptions,
} from "@modelcontextprotocol/client";
import type { Prompt, Resource, Tool } from "@modelcontextprotocol/client";
import {
  LoggerFactory,
  type ProviderInstanceExplorer,
} from "@nestjs-port/core";
import {
  McpPromptListChangedProvider,
  McpResourceListChangedProvider,
  McpToolListChangedProvider,
} from "@nestjs-ai/mcp-annotations";
import type {
  McpClientConnectionSpec,
  McpClientModuleOptions,
  McpClientRegistration,
} from "./mcp-client-module.options.js";
import {
  createMcpClientTransport,
  normalizeMcpClientConnectionSpecs,
} from "./mcp-client-module.options.js";
import { MCP_CLIENT_MODULE_OPTIONS_TOKEN } from "./mcp-client.tokens.js";
import { MCP_CLIENT_REGISTRATIONS_TOKEN } from "./mcp-client.tokens.js";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";

@Injectable()
export class McpClientAnnotationRegistrar
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = LoggerFactory.getLogger(
    McpClientAnnotationRegistrar.name,
  );

  private registered = false;

  constructor(
    @Inject(MCP_CLIENT_MODULE_OPTIONS_TOKEN)
    private readonly options: McpClientModuleOptions,
    @Inject(MCP_CLIENT_REGISTRATIONS_TOKEN)
    private readonly clientRegistrations: McpClientRegistration[],
    @Inject(PROVIDER_INSTANCE_EXPLORER_TOKEN)
    private readonly providerInstanceExplorer: ProviderInstanceExplorer,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.registered) {
      return;
    }

    const annotationScannerEnabled =
      this.options.annotationScanner?.enabled ?? true;
    const providerInstances = annotationScannerEnabled
      ? this.providerInstanceExplorer.getProviderInstances()
      : [];

    await this.populateClientRegistrations(
      providerInstances,
      annotationScannerEnabled,
    );

    this.registered = true;
  }

  async onModuleDestroy(): Promise<void> {
    for (const registration of this.clientRegistrations) {
      await registration.mcpClient.close().catch((error: unknown) => {
        this.logger.warn(
          `Failed to close MCP client "${registration.clientName}": ${String(error)}`,
        );
      });
    }
  }

  private async populateClientRegistrations(
    providerInstances: object[],
    annotationScannerEnabled: boolean,
  ): Promise<void> {
    const promptListChangedSpecifications = new McpPromptListChangedProvider(
      providerInstances,
    ).getPromptListChangedSpecifications();
    const resourceListChangedSpecifications =
      new McpResourceListChangedProvider(
        providerInstances,
      ).getResourceListChangedSpecifications();
    const toolListChangedSpecifications = new McpToolListChangedProvider(
      providerInstances,
    ).getToolListChangedSpecifications();

    const connectionSpecs = await normalizeMcpClientConnectionSpecs(
      this.options,
    );

    try {
      for (const spec of connectionSpecs) {
        await this.registerClient(
          spec,
          promptListChangedSpecifications,
          resourceListChangedSpecifications,
          toolListChangedSpecifications,
          annotationScannerEnabled,
        );
      }
    } catch (error) {
      for (const registration of this.clientRegistrations.splice(0)) {
        await registration.mcpClient.close().catch(() => undefined);
      }
      throw error;
    }
  }

  private async registerClient(
    spec: McpClientConnectionSpec,
    promptListChangedSpecifications: ReturnType<
      McpPromptListChangedProvider["getPromptListChangedSpecifications"]
    >,
    resourceListChangedSpecifications: ReturnType<
      McpResourceListChangedProvider["getResourceListChangedSpecifications"]
    >,
    toolListChangedSpecifications: ReturnType<
      McpToolListChangedProvider["getToolListChangedSpecifications"]
    >,
    annotationScannerEnabled: boolean,
  ): Promise<void> {
    let mcpClient: McpClient;
    const listChanged = annotationScannerEnabled
      ? this.createListChangedHandlers(
          spec.clientName,
          () => mcpClient,
          promptListChangedSpecifications,
          resourceListChangedSpecifications,
          toolListChangedSpecifications,
        )
      : undefined;

    mcpClient = new McpClient(spec.clientInfo, {
      listChanged,
    });

    try {
      await mcpClient.connect(createMcpClientTransport(spec));
    } catch (error) {
      await mcpClient.close().catch(() => undefined);
      throw error;
    }

    this.clientRegistrations.push({
      clientName: spec.clientName,
      mcpClient,
    });
  }

  private createListChangedHandlers(
    clientName: string,
    mcpClientGetter: () => McpClient,
    promptListChangedSpecifications: ReturnType<
      McpPromptListChangedProvider["getPromptListChangedSpecifications"]
    >,
    resourceListChangedSpecifications: ReturnType<
      McpResourceListChangedProvider["getResourceListChangedSpecifications"]
    >,
    toolListChangedSpecifications: ReturnType<
      McpToolListChangedProvider["getToolListChangedSpecifications"]
    >,
  ): ListChangedHandlers {
    const handlers: ListChangedHandlers = {};

    const promptHandler = this.createPromptListChangedHandler(
      clientName,
      mcpClientGetter,
      promptListChangedSpecifications,
    );
    if (promptHandler != null) {
      handlers.prompts = promptHandler;
    }

    const resourceHandler = this.createResourceListChangedHandler(
      clientName,
      mcpClientGetter,
      resourceListChangedSpecifications,
    );
    if (resourceHandler != null) {
      handlers.resources = resourceHandler;
    }

    const toolHandler = this.createToolListChangedHandler(
      clientName,
      mcpClientGetter,
      toolListChangedSpecifications,
    );
    if (toolHandler != null) {
      handlers.tools = toolHandler;
    }

    return handlers;
  }

  private createPromptListChangedHandler(
    clientName: string,
    mcpClientGetter: () => McpClient,
    promptListChangedSpecifications: ReturnType<
      McpPromptListChangedProvider["getPromptListChangedSpecifications"]
    >,
  ): ListChangedOptions<Prompt> | undefined {
    const matchingSpecifications = promptListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpPromptListChanged methods matched client "${clientName}". Only one prompt list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return undefined;
    }

    return {
      onChanged: async (error, prompts) => {
        if (error != null) {
          this.logger.warn(
            `Failed to refresh prompts for client "${clientName}": ${error.message}`,
          );
          return;
        }

        if (prompts == null) {
          prompts = await this.collectAllPrompts(mcpClientGetter());
        }

        await spec.promptListChangeHandler(null, prompts);
      },
    };
  }

  private createResourceListChangedHandler(
    clientName: string,
    mcpClientGetter: () => McpClient,
    resourceListChangedSpecifications: ReturnType<
      McpResourceListChangedProvider["getResourceListChangedSpecifications"]
    >,
  ): ListChangedOptions<Resource> | undefined {
    const matchingSpecifications = resourceListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpResourceListChanged methods matched client "${clientName}". Only one resource list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return undefined;
    }

    return {
      onChanged: async (error, resources) => {
        if (error != null) {
          this.logger.warn(
            `Failed to refresh resources for client "${clientName}": ${error.message}`,
          );
          return;
        }

        if (resources == null) {
          resources = await this.collectAllResources(mcpClientGetter());
        }

        await spec.resourceListChangeHandler(null, resources);
      },
    };
  }

  private createToolListChangedHandler(
    clientName: string,
    mcpClientGetter: () => McpClient,
    toolListChangedSpecifications: ReturnType<
      McpToolListChangedProvider["getToolListChangedSpecifications"]
    >,
  ): ListChangedOptions<Tool> | undefined {
    const matchingSpecifications = toolListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpToolListChanged methods matched client "${clientName}". Only one tool list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return undefined;
    }

    return {
      onChanged: async (error, tools) => {
        if (error != null) {
          this.logger.warn(
            `Failed to refresh tools for client "${clientName}": ${error.message}`,
          );
          return;
        }

        if (tools == null) {
          tools = await this.collectAllTools(mcpClientGetter());
        }

        await spec.toolListChangeHandler(null, tools);
      },
    };
  }

  private async collectAllPrompts(mcpClient: McpClient): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    let cursor: string | undefined;

    do {
      const result = await mcpClient.listPrompts({ cursor });
      prompts.push(...result.prompts);
      cursor = result.nextCursor;
    } while (cursor);

    return prompts;
  }

  private async collectAllResources(mcpClient: McpClient): Promise<Resource[]> {
    const resources: Resource[] = [];
    let cursor: string | undefined;

    do {
      const result = await mcpClient.listResources({ cursor });
      resources.push(...result.resources);
      cursor = result.nextCursor;
    } while (cursor);

    return resources;
  }

  private async collectAllTools(mcpClient: McpClient): Promise<Tool[]> {
    const tools: Tool[] = [];
    let cursor: string | undefined;

    do {
      const result = await mcpClient.listTools({ cursor });
      tools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);

    return tools;
  }
}
