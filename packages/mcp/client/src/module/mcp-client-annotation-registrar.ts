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
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import {
  Client as McpClient,
  type ListChangedHandlers,
  type ListChangedOptions,
} from "@modelcontextprotocol/client";
import type {
  CreateMessageRequest,
  ElicitRequest,
  LoggingMessageNotification,
  Prompt,
  ProgressNotification,
  Resource,
  Tool,
} from "@modelcontextprotocol/client";
import {
  LoggerFactory,
  type ProviderInstanceExplorer,
} from "@nestjs-port/core";
import {
  McpElicitationProvider,
  McpLoggingProvider,
  McpProgressProvider,
  McpPromptListChangedProvider,
  McpResourceListChangedProvider,
  McpSamplingProvider,
  McpToolListChangedProvider,
} from "@nestjs-ai/mcp-annotations";
import type {
  McpClientModuleOptions,
  McpClientRegistration,
} from "./mcp-client-module.options.js";
import { MCP_CLIENT_MODULE_OPTIONS_TOKEN } from "./mcp-client.tokens.js";
import { MCP_CLIENT_REGISTRATIONS_TOKEN } from "./mcp-client.tokens.js";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";

@Injectable()
export class McpClientAnnotationRegistrar implements OnModuleInit {
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

  onModuleInit(): void {
    if (this.registered) {
      return;
    }

    const providerInstances =
      this.providerInstanceExplorer.getProviderInstances();

    this.populateClientRegistrations(providerInstances);

    this.registerSampling(providerInstances);
    this.registerLogging(providerInstances);
    this.registerProgress(providerInstances);
    this.registerElicitation(providerInstances);
    this.registered = true;
  }

  private populateClientRegistrations(providerInstances: object[]): void {
    if (this.options.clients.length === 0) {
      throw new Error("clients must not be empty");
    }

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

    const registrations = this.options.clients.map((client) => {
      assert(client.clientInfo != null, "clientInfo must not be null");
      if (client.clientInfo.name.trim().length === 0) {
        throw new Error("clientInfo.name must not be empty");
      }

      let mcpClient: McpClient;
      const listChanged = this.mergeListChangedHandlers(
        client.clientOptions?.listChanged,
        this.createListChangedHandlers(
          client.clientInfo.name,
          () => mcpClient,
          promptListChangedSpecifications,
          resourceListChangedSpecifications,
          toolListChangedSpecifications,
        ),
      );

      mcpClient = new McpClient(client.clientInfo, {
        ...client.clientOptions,
        listChanged,
      });
      return {
        clientName: client.clientInfo.name,
        mcpClient,
      };
    });

    this.clientRegistrations.push(...registrations);
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

  private mergeListChangedHandlers(
    base: ListChangedHandlers | undefined,
    extra: ListChangedHandlers,
  ): ListChangedHandlers | undefined {
    const merged: ListChangedHandlers = base == null ? {} : { ...base };

    if (extra.prompts != null) {
      merged.prompts = this.mergeListChangedOptions(
        base?.prompts,
        extra.prompts,
      );
    }
    if (extra.resources != null) {
      merged.resources = this.mergeListChangedOptions(
        base?.resources,
        extra.resources,
      );
    }
    if (extra.tools != null) {
      merged.tools = this.mergeListChangedOptions(base?.tools, extra.tools);
    }

    return merged.prompts != null ||
      merged.resources != null ||
      merged.tools != null
      ? merged
      : undefined;
  }

  private mergeListChangedOptions<T>(
    base: ListChangedOptions<T> | undefined,
    extra: ListChangedOptions<T> | undefined,
  ): ListChangedOptions<T> | undefined {
    if (base == null) {
      return extra;
    }
    if (extra == null) {
      return base;
    }

    return {
      autoRefresh: extra.autoRefresh ?? base.autoRefresh,
      debounceMs: extra.debounceMs ?? base.debounceMs,
      onChanged: async (error, items) => {
        base.onChanged(error, items);
        extra.onChanged(error, items);
      },
    };
  }

  private registerSampling(providerInstances: object[]): void {
    if (this.options.annotations?.sampling === false) {
      this.logger.debug("MCP sampling registration is disabled");
      return;
    }

    const samplingSpecifications = new McpSamplingProvider(
      providerInstances,
    ).getSamplingSpecifications();

    if (samplingSpecifications.length === 0) {
      this.logger.warn("No @McpSampling methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP sampling methods were not registered.",
      );
      return;
    }
    for (const registration of this.clientRegistrations) {
      this.registerSamplingForClient(
        registration.clientName,
        registration.mcpClient,
        samplingSpecifications,
      );
    }
  }

  private registerSamplingForClient(
    clientName: string,
    mcpClient: McpClient,
    samplingSpecifications: ReturnType<
      McpSamplingProvider["getSamplingSpecifications"]
    >,
  ): void {
    const matchingSpecifications = samplingSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpSampling methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpSampling methods matched client "${clientName}". Only one sampling handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering sampling handler for client "${clientName}"`,
    );
    mcpClient.setRequestHandler(
      "sampling/createMessage",
      async (request: CreateMessageRequest) => spec.samplingHandler(request),
    );
  }

  private registerLogging(providerInstances: object[]): void {
    if (this.options.annotations?.logging === false) {
      this.logger.debug("MCP logging registration is disabled");
      return;
    }

    const loggingSpecifications = new McpLoggingProvider(
      providerInstances,
    ).getLoggingSpecifications();

    if (loggingSpecifications.length === 0) {
      this.logger.warn("No @McpLogging methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP logging methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerLoggingForClient(
        registration.clientName,
        registration.mcpClient,
        loggingSpecifications,
      );
    }
  }

  private registerLoggingForClient(
    clientName: string,
    mcpClient: McpClient,
    loggingSpecifications: ReturnType<
      McpLoggingProvider["getLoggingSpecifications"]
    >,
  ): void {
    const matchingSpecifications = loggingSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpLogging methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpLogging methods matched client "${clientName}". Only one logging handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(`Registering logging handler for client "${clientName}"`);
    mcpClient.setNotificationHandler(
      "notifications/message",
      async (notification: LoggingMessageNotification) => {
        await spec.loggingHandler(notification);
      },
    );
  }

  private registerProgress(providerInstances: object[]): void {
    if (this.options.annotations?.progress === false) {
      this.logger.debug("MCP progress registration is disabled");
      return;
    }

    const progressSpecifications = new McpProgressProvider(
      providerInstances,
    ).getProgressSpecifications();

    if (progressSpecifications.length === 0) {
      this.logger.warn("No @McpProgress methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP progress methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerProgressForClient(
        registration.clientName,
        registration.mcpClient,
        progressSpecifications,
      );
    }
  }

  private registerProgressForClient(
    clientName: string,
    mcpClient: McpClient,
    progressSpecifications: ReturnType<
      McpProgressProvider["getProgressSpecifications"]
    >,
  ): void {
    const matchingSpecifications = progressSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpProgress methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpProgress methods matched client "${clientName}". Only one progress handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering progress handler for client "${clientName}"`,
    );
    mcpClient.setNotificationHandler(
      "notifications/progress",
      async (notification: ProgressNotification) => {
        await spec.progressHandler(notification);
      },
    );
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

  private registerElicitation(providerInstances: object[]): void {
    if (this.options.annotations?.elicitation === false) {
      this.logger.debug("MCP elicitation registration is disabled");
      return;
    }

    const elicitationSpecifications = new McpElicitationProvider(
      providerInstances,
    ).getElicitationSpecifications();

    if (elicitationSpecifications.length === 0) {
      this.logger.warn("No @McpElicitation methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP elicitation methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerElicitationForClient(
        registration.clientName,
        registration.mcpClient,
        elicitationSpecifications,
      );
    }
  }

  private registerElicitationForClient(
    clientName: string,
    mcpClient: McpClient,
    elicitationSpecifications: ReturnType<
      McpElicitationProvider["getElicitationSpecifications"]
    >,
  ): void {
    const matchingSpecifications = elicitationSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpElicitation methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpElicitation methods matched client "${clientName}". Only one elicitation handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering elicitation handler for client "${clientName}"`,
    );
    mcpClient.setRequestHandler(
      "elicitation/create",
      async (request: ElicitRequest) => spec.elicitationHandler(request),
    );
  }
}
