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
import type {
  Client as McpClient,
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
  McpPromptListChangedProvider,
  McpResourceListChangedProvider,
  McpToolListChangedProvider,
  McpElicitationProvider,
  McpLoggingProvider,
  McpProgressProvider,
  McpSamplingProvider,
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

    this.registerSampling();
    this.registerLogging();
    this.registerProgress();
    this.registerElicitation();
    this.registerPromptListChanged();
    this.registerResourceListChanged();
    this.registerToolListChanged();
    this.registered = true;
  }

  private registerSampling(): void {
    if (this.options.annotations?.sampling === false) {
      this.logger.debug("MCP sampling registration is disabled");
      return;
    }

    const samplingSpecifications = new McpSamplingProvider({
      samplingObjects: this.providerInstanceExplorer.getProviderInstances(),
    }).getSamplingSpecifications();

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

  private registerLogging(): void {
    if (this.options.annotations?.logging === false) {
      this.logger.debug("MCP logging registration is disabled");
      return;
    }

    const loggingSpecifications = new McpLoggingProvider({
      loggingObjects: this.providerInstanceExplorer.getProviderInstances(),
    }).getLoggingSpecifications();

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

  private registerProgress(): void {
    if (this.options.annotations?.progress === false) {
      this.logger.debug("MCP progress registration is disabled");
      return;
    }

    const progressSpecifications = new McpProgressProvider({
      progressObjects: this.providerInstanceExplorer.getProviderInstances(),
    }).getProgressSpecifications();

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

  private registerElicitation(): void {
    if (this.options.annotations?.elicitation === false) {
      this.logger.debug("MCP elicitation registration is disabled");
      return;
    }

    const elicitationSpecifications = new McpElicitationProvider({
      elicitationObjects: this.providerInstanceExplorer.getProviderInstances(),
    }).getElicitationSpecifications();

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

  private registerPromptListChanged(): void {
    if (this.options.annotations?.promptListChanged === false) {
      this.logger.debug("MCP prompt list changed registration is disabled");
      return;
    }

    const promptListChangedSpecifications = new McpPromptListChangedProvider({
      promptListChangedObjects:
        this.providerInstanceExplorer.getProviderInstances(),
    }).getPromptListChangedSpecifications();

    if (promptListChangedSpecifications.length === 0) {
      this.logger.warn("No @McpPromptListChanged methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP prompt list changed methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerPromptListChangedForClient(
        registration.clientName,
        registration.mcpClient,
        promptListChangedSpecifications,
      );
    }
  }

  private registerPromptListChangedForClient(
    clientName: string,
    mcpClient: McpClient,
    promptListChangedSpecifications: ReturnType<
      McpPromptListChangedProvider["getPromptListChangedSpecifications"]
    >,
  ): void {
    const matchingSpecifications = promptListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpPromptListChanged methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpPromptListChanged methods matched client "${clientName}". Only one prompt list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering prompt list changed handler for client "${clientName}"`,
    );
    mcpClient.setNotificationHandler(
      "notifications/prompts/list_changed",
      async (): Promise<void> => {
        const prompts = await this.collectAllPrompts(mcpClient);
        await spec.promptListChangeHandler(null, prompts);
      },
    );
  }

  private registerResourceListChanged(): void {
    if (this.options.annotations?.resourceListChanged === false) {
      this.logger.debug("MCP resource list changed registration is disabled");
      return;
    }

    const resourceListChangedSpecifications =
      new McpResourceListChangedProvider({
        resourceListChangedObjects:
          this.providerInstanceExplorer.getProviderInstances(),
      }).getResourceListChangedSpecifications();

    if (resourceListChangedSpecifications.length === 0) {
      this.logger.warn("No @McpResourceListChanged methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP resource list changed methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerResourceListChangedForClient(
        registration.clientName,
        registration.mcpClient,
        resourceListChangedSpecifications,
      );
    }
  }

  private registerResourceListChangedForClient(
    clientName: string,
    mcpClient: McpClient,
    resourceListChangedSpecifications: ReturnType<
      McpResourceListChangedProvider["getResourceListChangedSpecifications"]
    >,
  ): void {
    const matchingSpecifications = resourceListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpResourceListChanged methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpResourceListChanged methods matched client "${clientName}". Only one resource list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering resource list changed handler for client "${clientName}"`,
    );
    mcpClient.setNotificationHandler(
      "notifications/resources/list_changed",
      async (): Promise<void> => {
        const resources = await this.collectAllResources(mcpClient);
        await spec.resourceListChangeHandler(null, resources);
      },
    );
  }

  private registerToolListChanged(): void {
    if (this.options.annotations?.toolListChanged === false) {
      this.logger.debug("MCP tool list changed registration is disabled");
      return;
    }

    const toolListChangedSpecifications = new McpToolListChangedProvider({
      toolListChangedObjects:
        this.providerInstanceExplorer.getProviderInstances(),
    }).getToolListChangedSpecifications();

    if (toolListChangedSpecifications.length === 0) {
      this.logger.warn("No @McpToolListChanged methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP tool list changed methods were not registered.",
      );
      return;
    }

    for (const registration of this.clientRegistrations) {
      this.registerToolListChangedForClient(
        registration.clientName,
        registration.mcpClient,
        toolListChangedSpecifications,
      );
    }
  }

  private registerToolListChangedForClient(
    clientName: string,
    mcpClient: McpClient,
    toolListChangedSpecifications: ReturnType<
      McpToolListChangedProvider["getToolListChangedSpecifications"]
    >,
  ): void {
    const matchingSpecifications = toolListChangedSpecifications.filter(
      (spec) => spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpToolListChanged methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpToolListChanged methods matched client "${clientName}". Only one tool list changed handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering tool list changed handler for client "${clientName}"`,
    );
    mcpClient.setNotificationHandler(
      "notifications/tools/list_changed",
      async (): Promise<void> => {
        const tools = await this.collectAllTools(mcpClient);
        await spec.toolListChangeHandler(null, tools);
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
}
