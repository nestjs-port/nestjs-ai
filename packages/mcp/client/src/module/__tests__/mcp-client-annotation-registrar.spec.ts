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
  ProgressNotification,
  Tool,
} from "@modelcontextprotocol/client";
import type * as McpClientModule from "@modelcontextprotocol/client";
import {
  McpElicitation,
  McpLogging,
  McpProgress,
  McpSampling,
  McpToolListChanged,
} from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { describe, expect, it, vi } from "vitest";

const constructedClients: any[] = [];

vi.mock("@modelcontextprotocol/client", async () => {
  const actual = await vi.importActual<typeof McpClientModule>(
    "@modelcontextprotocol/client",
  );

  class MockMcpClient {
    setRequestHandler = vi.fn();

    setNotificationHandler = vi.fn();

    listPrompts = vi.fn();

    listResources = vi.fn();

    listTools = vi.fn();

    constructor(
      public readonly clientInfo: unknown,
      public readonly clientOptions: unknown,
    ) {
      constructedClients.push(this);
    }
  }

  return {
    ...actual,
    Client: MockMcpClient,
  };
});

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

  it("creates clients lazily with listChanged handlers when registrations are empty", async () => {
    class RuntimeChangedProvider {
      seenTools: Tool[] | null = null;

      @McpToolListChanged({ clients: ["runtime-client"] })
      handleToolListChanged(tools: Tool[]): void {
        this.seenTools = tools;
      }
    }

    const runtimeProvider = new RuntimeChangedProvider();
    const registrations = [] as never[];
    constructedClients.length = 0;

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [runtimeProvider],
    };

    const registrar = new McpClientAnnotationRegistrar(
      {
        clients: [
          {
            clientInfo: {
              name: "runtime-client",
              version: "1.0.0",
            },
          },
        ],
        annotations: {
          toolListChanged: true,
        },
      },
      registrations,
      explorer,
    );

    registrar.onModuleInit();

    expect(constructedClients).toHaveLength(1);
    expect(registrations).toHaveLength(1);

    const [createdClient] = constructedClients;
    const listChanged = createdClient.clientOptions.listChanged as {
      tools?: {
        onChanged: (error: Error | null, tools: Tool[] | null) => Promise<void>;
      };
    };

    await listChanged.tools?.onChanged(null, [{ name: "tool-1" } as Tool]);

    expect(runtimeProvider.seenTools).toEqual([{ name: "tool-1" } as Tool]);
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
