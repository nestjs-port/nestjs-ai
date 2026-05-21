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

import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  Client as McpClient,
  type ClientContext,
  type ClientCapabilities,
  type ElicitRequest,
  type ElicitResult,
  type LoggingMessageNotification,
  type NotificationMethod,
  type NotificationTypeMap,
  type ProgressNotification,
  type ListChangedHandlers,
  type ListChangedOptions,
  type CreateMessageRequest,
  type CreateMessageResult,
} from "@modelcontextprotocol/client";
import type { Prompt, Resource, Tool } from "@modelcontextprotocol/client";
import {
  LoggerFactory,
  type ProviderInstanceExplorer,
} from "@nestjs-port/core";
import type {
  McpClientCustomizer,
  McpToolCallbackProvider,
} from "@nestjs-ai/mcp-common";
import {
  McpElicitationProvider,
  McpLoggingProvider,
  McpProgressProvider,
  McpSamplingProvider,
  McpPromptListChangedProvider,
  McpResourceListChangedProvider,
  McpToolListChangedProvider,
} from "@nestjs-ai/mcp-annotations";
import type { McpToolCallbackEventBus } from "@nestjs-ai/mcp-common";
import type {
  McpClientConnectionSpec,
  McpClientModuleOptions,
  McpClientRegistration,
} from "./mcp-client-module.options.js";
import {
  createMcpClientTransport,
  normalizeMcpClientConnectionSpecs,
} from "./mcp-client-module.options.js";

export class McpClientAnnotationRegistrar
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = LoggerFactory.getLogger(
    McpClientAnnotationRegistrar.name,
  );

  private registered = false;

  constructor(
    private readonly options: McpClientModuleOptions,
    private readonly clientRegistrations: McpClientRegistration[],
    private readonly eventBus: McpToolCallbackEventBus,
    private readonly providerInstanceExplorer?: ProviderInstanceExplorer,
    private readonly clientCustomizer?: McpClientCustomizer,
    private readonly toolCallbackProvider?: McpToolCallbackProvider | null,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.registered) {
      return;
    }

    const annotationScannerEnabled =
      this.options.annotationScanner?.enabled ?? true;
    const providerInstances =
      annotationScannerEnabled && this.providerInstanceExplorer != null
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
    const loggingSpecifications = annotationScannerEnabled
      ? new McpLoggingProvider(providerInstances).getLoggingSpecifications()
      : [];
    const progressSpecifications = annotationScannerEnabled
      ? new McpProgressProvider(providerInstances).getProgressSpecifications()
      : [];
    const samplingSpecifications = annotationScannerEnabled
      ? new McpSamplingProvider(providerInstances).getSamplingSpecifications()
      : [];
    const elicitationSpecifications = annotationScannerEnabled
      ? new McpElicitationProvider(
          providerInstances,
        ).getElicitationSpecifications()
      : [];
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
          loggingSpecifications,
          progressSpecifications,
          samplingSpecifications,
          elicitationSpecifications,
          annotationScannerEnabled,
        );
      }

      this.toolCallbackProvider?.setMcpClients(
        this.clientRegistrations.map(({ mcpClient }) => mcpClient),
      );
      await this.toolCallbackProvider?.refresh();
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
    loggingSpecifications: ReturnType<
      McpLoggingProvider["getLoggingSpecifications"]
    >,
    progressSpecifications: ReturnType<
      McpProgressProvider["getProgressSpecifications"]
    >,
    samplingSpecifications: ReturnType<
      McpSamplingProvider["getSamplingSpecifications"]
    >,
    elicitationSpecifications: ReturnType<
      McpElicitationProvider["getElicitationSpecifications"]
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
      this.registerClientCapabilities(
        mcpClient,
        spec.clientName,
        samplingSpecifications,
        elicitationSpecifications,
      );
      this.registerClientHandlers(
        mcpClient,
        spec.clientName,
        loggingSpecifications,
        progressSpecifications,
        samplingSpecifications,
        elicitationSpecifications,
      );

      if (this.clientCustomizer != null) {
        this.clientCustomizer.customize(spec.clientName, mcpClient);
      }

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

        spec.promptListChangeHandler(null, prompts);
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

        spec.resourceListChangeHandler(null, resources);
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

        try {
          if (tools == null) {
            tools = await this.collectAllTools(mcpClientGetter());
          }

          spec.toolListChangeHandler(null, tools);
        } finally {
          this.eventBus.emitToolsListChanged(clientName);
        }
      },
    };
  }

  private registerClientCapabilities(
    mcpClient: McpClient,
    clientName: string,
    samplingSpecifications: ReturnType<
      McpSamplingProvider["getSamplingSpecifications"]
    >,
    elicitationSpecifications: ReturnType<
      McpElicitationProvider["getElicitationSpecifications"]
    >,
  ): void {
    const capabilities: ClientCapabilities = {};

    if (
      samplingSpecifications.some((spec) => spec.clients.includes(clientName))
    ) {
      capabilities.sampling = {};
    }

    if (
      elicitationSpecifications.some((spec) =>
        spec.clients.includes(clientName),
      )
    ) {
      capabilities.elicitation = {};
    }

    if (Object.keys(capabilities).length === 0) {
      return;
    }

    mcpClient.registerCapabilities(capabilities);
  }

  private registerClientHandlers(
    mcpClient: McpClient,
    clientName: string,
    loggingSpecifications: ReturnType<
      McpLoggingProvider["getLoggingSpecifications"]
    >,
    progressSpecifications: ReturnType<
      McpProgressProvider["getProgressSpecifications"]
    >,
    samplingSpecifications: ReturnType<
      McpSamplingProvider["getSamplingSpecifications"]
    >,
    elicitationSpecifications: ReturnType<
      McpElicitationProvider["getElicitationSpecifications"]
    >,
  ): void {
    const loggingHandler = this.createLoggingHandler(
      clientName,
      loggingSpecifications,
    );
    if (loggingHandler != null) {
      mcpClient.setNotificationHandler("notifications/message", loggingHandler);
    }

    const progressHandler = this.createProgressHandler(
      mcpClient,
      clientName,
      progressSpecifications,
    );
    if (progressHandler != null) {
      mcpClient.setNotificationHandler(
        "notifications/progress",
        progressHandler,
      );
    }

    const samplingHandler = this.createSamplingHandler(
      clientName,
      samplingSpecifications,
    );
    if (samplingHandler != null) {
      mcpClient.setRequestHandler("sampling/createMessage", samplingHandler);
    }

    const elicitationHandler = this.createElicitationHandler(
      clientName,
      elicitationSpecifications,
    );
    if (elicitationHandler != null) {
      mcpClient.setRequestHandler("elicitation/create", elicitationHandler);
    }
  }

  private createLoggingHandler(
    clientName: string,
    loggingSpecifications: ReturnType<
      McpLoggingProvider["getLoggingSpecifications"]
    >,
  ): ((notification: LoggingMessageNotification) => Promise<void>) | undefined {
    const matchingSpecifications = loggingSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    return async (notification: LoggingMessageNotification): Promise<void> => {
      await Promise.all(
        matchingSpecifications.map((spec) => spec.loggingHandler(notification)),
      );
    };
  }

  private createProgressHandler(
    mcpClient: McpClient,
    clientName: string,
    progressSpecifications: ReturnType<
      McpProgressProvider["getProgressSpecifications"]
    >,
  ): ((notification: ProgressNotification) => Promise<void>) | undefined {
    const matchingSpecifications = progressSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    const originalHandler = this.getNotificationHandler(
      mcpClient,
      "notifications/progress",
    );

    return async (notification: ProgressNotification): Promise<void> => {
      if (originalHandler != null) {
        await originalHandler(notification);
      }

      await Promise.all(
        matchingSpecifications.map((spec) =>
          spec.progressHandler(notification),
        ),
      );
    };
  }

  private createSamplingHandler(
    clientName: string,
    samplingSpecifications: ReturnType<
      McpSamplingProvider["getSamplingSpecifications"]
    >,
  ):
    | ((
        request: CreateMessageRequest,
        context: ClientContext,
      ) => Promise<CreateMessageResult>)
    | undefined {
    const matchingSpecifications = samplingSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpSampling methods matched client "${clientName}". Only one sampling handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return undefined;
    }

    return async (
      request: CreateMessageRequest,
      _context: ClientContext,
    ): Promise<CreateMessageResult> => spec.samplingHandler(request);
  }

  private createElicitationHandler(
    clientName: string,
    elicitationSpecifications: ReturnType<
      McpElicitationProvider["getElicitationSpecifications"]
    >,
  ):
    | ((
        request: ElicitRequest,
        context: ClientContext,
      ) => Promise<ElicitResult>)
    | undefined {
    const matchingSpecifications = elicitationSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      return undefined;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpElicitation methods matched client "${clientName}". Only one elicitation handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return undefined;
    }

    return async (
      request: ElicitRequest,
      _context: ClientContext,
    ): Promise<ElicitResult> => spec.elicitationHandler(request);
  }

  private getNotificationHandler<M extends NotificationMethod>(
    mcpClient: McpClient,
    method: M,
  ):
    | ((notification: NotificationTypeMap[M]) => Promise<void> | void)
    | undefined {
    const notificationHandlers = (
      mcpClient as unknown as {
        _notificationHandlers?: Map<
          NotificationMethod,
          (
            notification: NotificationTypeMap[NotificationMethod],
          ) => Promise<void> | void
        >;
      }
    )._notificationHandlers;

    return notificationHandlers?.get(method) as
      | ((notification: NotificationTypeMap[M]) => Promise<void> | void)
      | undefined;
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
