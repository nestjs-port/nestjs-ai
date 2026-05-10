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

import "reflect-metadata";

import type {
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  ElicitResult,
  Client as McpClient,
  LoggingLevel,
  Prompt,
  ProgressNotification,
  Resource,
  Tool,
} from "@modelcontextprotocol/client";
import {
  McpElicitation,
  McpLogging,
  McpProgress,
  McpPromptListChanged,
  McpSampling,
  McpResourceListChanged,
  McpToolListChanged,
} from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { describe, expect, it, vi } from "vitest";

import { McpClientAnnotationRegistrar } from "../mcp-client-annotation-registrar.js";

describe("McpClientAnnotationRegistrar", () => {
  it("registers sampling handlers for matching clients", () => {
    class SamplingProvider {
      @McpSampling({ clients: ["server-a"] })
      handleServerA(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a" },
          model: "test-model-a",
        };
      }

      @McpSampling({ clients: ["server-b"] })
      handleServerB(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "b" },
          model: "test-model-b",
        };
      }
    }

    const clientASetRequestHandler = vi.fn();
    const clientBSetRequestHandler = vi.fn();

    const clientA = {
      setRequestHandler: clientASetRequestHandler,
    } as unknown as McpClient;
    const clientB = {
      setRequestHandler: clientBSetRequestHandler,
    } as unknown as McpClient;

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new SamplingProvider()],
    };

    const registrar = new McpClientAnnotationRegistrar(
      {
        clients: [
          {
            clientInfo: {
              name: "server-a",
              version: "1.0.0",
            },
          },
        ],
        annotations: { sampling: true },
      },
      [
        {
          clientName: "server-a",
          mcpClient: clientA,
        },
        {
          clientName: "server-b",
          mcpClient: clientB,
        },
      ],
      explorer,
    );

    registrar.onModuleInit();

    expect(clientASetRequestHandler).toHaveBeenCalledTimes(1);
    expect(clientASetRequestHandler).toHaveBeenCalledWith(
      "sampling/createMessage",
      expect.any(Function),
    );
    expect(clientBSetRequestHandler).toHaveBeenCalledTimes(1);
    expect(clientBSetRequestHandler).toHaveBeenCalledWith(
      "sampling/createMessage",
      expect.any(Function),
    );
  });

  it("registers logging, progress, and elicitation handlers for matching clients", () => {
    class ClientHandlerProvider {
      seenLevel: LoggingLevel | null = null;

      seenLogger: string | null = null;

      seenData: string | null = null;

      seenProgress: ProgressNotification | null = null;

      seenElicitation: ElicitRequest | null = null;

      @McpLogging({ clients: ["logging-client"] })
      handleLogging(level: LoggingLevel, logger: string, data: string): void {
        this.seenLevel = level;
        this.seenLogger = logger;
        this.seenData = data;
      }

      @McpProgress({ clients: ["progress-client"] })
      handleProgress(notification: ProgressNotification): void {
        this.seenProgress = notification;
      }

      @McpElicitation({ clients: ["elicitation-client"] })
      handleElicitation(request: ElicitRequest): ElicitResult {
        this.seenElicitation = request;
        return {
          action: "accept",
          content: { answer: "accepted" },
        } as ElicitResult;
      }
    }

    const clientLoggingSetNotificationHandler = vi.fn();
    const clientProgressSetNotificationHandler = vi.fn();
    const clientElicitationSetRequestHandler = vi.fn();

    const clientLogging = {
      setNotificationHandler: clientLoggingSetNotificationHandler,
    } as unknown as McpClient;
    const clientProgress = {
      setNotificationHandler: clientProgressSetNotificationHandler,
    } as unknown as McpClient;
    const clientElicitation = {
      setRequestHandler: clientElicitationSetRequestHandler,
    } as unknown as McpClient;

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new ClientHandlerProvider()],
    };

    const registrar = new McpClientAnnotationRegistrar(
      {
        clients: [
          {
            clientInfo: {
              name: "logging-client",
              version: "1.0.0",
            },
          },
          {
            clientInfo: {
              name: "progress-client",
              version: "1.0.0",
            },
          },
          {
            clientInfo: {
              name: "elicitation-client",
              version: "1.0.0",
            },
          },
        ],
        annotations: {
          logging: true,
          progress: true,
          elicitation: true,
        },
      },
      [
        {
          clientName: "logging-client",
          mcpClient: clientLogging,
        },
        {
          clientName: "progress-client",
          mcpClient: clientProgress,
        },
        {
          clientName: "elicitation-client",
          mcpClient: clientElicitation,
        },
      ],
      explorer,
    );

    registrar.onModuleInit();

    expect(clientLoggingSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(clientLoggingSetNotificationHandler).toHaveBeenCalledWith(
      "notifications/message",
      expect.any(Function),
    );
    expect(clientProgressSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(clientProgressSetNotificationHandler).toHaveBeenCalledWith(
      "notifications/progress",
      expect.any(Function),
    );
    expect(clientElicitationSetRequestHandler).toHaveBeenCalledTimes(1);
    expect(clientElicitationSetRequestHandler).toHaveBeenCalledWith(
      "elicitation/create",
      expect.any(Function),
    );
  });

  it("registers changed handlers and refreshes the full lists", async () => {
    class ChangedProvider {
      seenPrompts: Prompt[] | null = null;

      seenResources: Resource[] | null = null;

      seenTools: Tool[] | null = null;

      @McpPromptListChanged({ clients: ["changed-client"] })
      handlePromptListChanged(prompts: Prompt[]): void {
        this.seenPrompts = prompts;
      }

      @McpResourceListChanged({ clients: ["changed-client"] })
      handleResourceListChanged(resources: Resource[]): void {
        this.seenResources = resources;
      }

      @McpToolListChanged({ clients: ["changed-client"] })
      handleToolListChanged(tools: Tool[]): void {
        this.seenTools = tools;
      }
    }

    const changedProvider = new ChangedProvider();
    let promptListChangedHandler: (() => Promise<void>) | undefined;
    let resourceListChangedHandler: (() => Promise<void>) | undefined;
    let toolListChangedHandler: (() => Promise<void>) | undefined;

    const listPrompts = vi
      .fn()
      .mockResolvedValueOnce({
        prompts: [{ name: "prompt-1" } as Prompt],
        nextCursor: "next-prompts",
      })
      .mockResolvedValueOnce({
        prompts: [{ name: "prompt-2" } as Prompt],
        nextCursor: undefined,
      });
    const listResources = vi
      .fn()
      .mockResolvedValueOnce({
        resources: [
          { name: "resource-1", uri: "file:///resource-1" } as Resource,
        ],
        nextCursor: "next-resources",
      })
      .mockResolvedValueOnce({
        resources: [
          { name: "resource-2", uri: "file:///resource-2" } as Resource,
        ],
        nextCursor: undefined,
      });
    const listTools = vi
      .fn()
      .mockResolvedValueOnce({
        tools: [{ name: "tool-1" } as Tool],
        nextCursor: "next-tools",
      })
      .mockResolvedValueOnce({
        tools: [{ name: "tool-2" } as Tool],
        nextCursor: undefined,
      });

    const client = {
      setNotificationHandler: vi.fn(
        (method: string, handler: () => Promise<void>) => {
          if (method === "notifications/prompts/list_changed") {
            promptListChangedHandler = handler;
          }
          if (method === "notifications/resources/list_changed") {
            resourceListChangedHandler = handler;
          }
          if (method === "notifications/tools/list_changed") {
            toolListChangedHandler = handler;
          }
        },
      ),
      listPrompts,
      listResources,
      listTools,
    } as unknown as McpClient;

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [changedProvider],
    };

    const registrar = new McpClientAnnotationRegistrar(
      {
        clients: [
          {
            clientInfo: {
              name: "changed-client",
              version: "1.0.0",
            },
          },
        ],
        annotations: {
          promptListChanged: true,
          resourceListChanged: true,
          toolListChanged: true,
        },
      },
      [{ clientName: "changed-client", mcpClient: client }],
      explorer,
    );

    registrar.onModuleInit();

    expect(promptListChangedHandler).toBeDefined();
    expect(resourceListChangedHandler).toBeDefined();
    expect(toolListChangedHandler).toBeDefined();

    await promptListChangedHandler?.();
    await resourceListChangedHandler?.();
    await toolListChangedHandler?.();

    expect(listPrompts).toHaveBeenCalledTimes(2);
    expect(listResources).toHaveBeenCalledTimes(2);
    expect(listTools).toHaveBeenCalledTimes(2);

    expect(changedProvider.seenPrompts).toHaveLength(2);
    expect(changedProvider.seenResources).toHaveLength(2);
    expect(changedProvider.seenTools).toHaveLength(2);
  });

  it("throws when more than one sampling method targets the same client", () => {
    class SamplingProvider {
      @McpSampling({ clients: ["server-a"] })
      handleServerA(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a" },
          model: "test-model-a",
        };
      }

      @McpSampling({ clients: ["server-a"] })
      handleServerAAgain(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a2" },
          model: "test-model-a2",
        };
      }
    }

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new SamplingProvider()],
    };

    const registrar = new McpClientAnnotationRegistrar(
      {
        clients: [
          {
            clientInfo: {
              name: "server-a",
              version: "1.0.0",
            },
          },
        ],
        annotations: { sampling: true },
      },
      [
        {
          clientName: "server-a",
          mcpClient: {
            setRequestHandler: vi.fn(),
          } as unknown as McpClient,
        },
      ],
      explorer,
    );

    expect(() => registrar.onModuleInit()).toThrowError(
      /Multiple @McpSampling methods matched client "server-a"/,
    );
  });
});
