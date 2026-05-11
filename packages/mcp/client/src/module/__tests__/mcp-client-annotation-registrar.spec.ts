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

import type * as McpClientModule from "@modelcontextprotocol/client";
import {
  StdioClientTransport,
  StreamableHTTPClientTransport,
  type Tool,
} from "@modelcontextprotocol/client";
import { McpToolListChanged } from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructedClients: MockMcpClient[] = [];

vi.mock("@modelcontextprotocol/client", async () => {
  const actual = await vi.importActual<typeof McpClientModule>(
    "@modelcontextprotocol/client",
  );

  class MockStdioClientTransport {
    constructor(public readonly options: unknown) {}
  }

  class MockStreamableHTTPClientTransport {
    constructor(
      public readonly url: URL,
      public readonly options: unknown,
    ) {}
  }

  class MockMcpClient {
    public readonly setRequestHandler = vi.fn();

    public readonly setNotificationHandler = vi.fn();

    public readonly listPrompts = vi.fn();

    public readonly listResources = vi.fn();

    public readonly listTools = vi.fn();

    public readonly connect = vi.fn(async (transport: unknown) => {
      this.connectedTransport = transport;
    });

    public readonly close = vi.fn(async () => undefined);

    public connectedTransport: unknown;

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
    StdioClientTransport: MockStdioClientTransport,
    StreamableHTTPClientTransport: MockStreamableHTTPClientTransport,
  };
});

import { McpClientAnnotationRegistrar } from "../mcp-client-annotation-registrar.js";

type MockMcpClient = any;

describe("McpClientAnnotationRegistrar", () => {
  beforeEach(() => {
    constructedClients.length = 0;
  });

  it("creates clients from stdio and streamable-http connections", async () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [],
    };
    const getProviderInstances = vi.spyOn(explorer, "getProviderInstances");
    const registrations: any[] = [];

    const registrar = new McpClientAnnotationRegistrar(
      {
        name: "my-client",
        version: "1.0.0",
        stdio: {
          connections: {
            stdioServer: {
              command: "node",
              args: ["stdio-server.js"],
            },
          },
        },
        streamableHttp: {
          connections: {
            httpServer: {
              url: "http://localhost:8080",
              endpoint: "/mcp",
            },
          },
        },
      },
      registrations,
      explorer,
    );

    await registrar.onModuleInit();

    expect(getProviderInstances).toHaveBeenCalledTimes(1);
    expect(constructedClients).toHaveLength(2);
    expect(registrations).toHaveLength(2);
    expect(
      registrations.map((registration) => registration.clientName),
    ).toEqual(["stdioServer", "httpServer"]);
    expect(constructedClients[0]?.clientInfo).toMatchObject({
      name: "my-client - stdioServer",
      version: "1.0.0",
    });
    expect(constructedClients[1]?.clientInfo).toMatchObject({
      name: "my-client - httpServer",
      version: "1.0.0",
    });
    expect(constructedClients[0]?.connectedTransport).toBeInstanceOf(
      StdioClientTransport,
    );
    expect(constructedClients[1]?.connectedTransport).toBeInstanceOf(
      StreamableHTTPClientTransport,
    );
  });

  it("registers changed handlers only for the matching connection name", async () => {
    class ToolProvider {
      seenTools: Tool[] | null = null;

      @McpToolListChanged({ clients: ["stdioServer"] })
      handleToolListChanged(tools: Tool[]): void {
        this.seenTools = tools;
      }
    }

    const provider = new ToolProvider();
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [provider],
    };
    const getProviderInstances = vi.spyOn(explorer, "getProviderInstances");
    const registrations: any[] = [];

    const registrar = new McpClientAnnotationRegistrar(
      {
        name: "my-client",
        version: "1.0.0",
        stdio: {
          connections: {
            stdioServer: {
              command: "node",
            },
            otherServer: {
              command: "node",
            },
          },
        },
      },
      registrations,
      explorer,
    );

    await registrar.onModuleInit();

    expect(getProviderInstances).toHaveBeenCalledTimes(1);
    expect(registrations).toHaveLength(2);

    const [stdioClient, otherClient] = constructedClients;
    const listChanged = stdioClient?.clientOptions as {
      listChanged?: {
        tools?: {
          onChanged: (
            error: Error | null,
            tools: Tool[] | null,
          ) => Promise<void>;
        };
      };
    };

    expect(listChanged.listChanged?.tools?.onChanged).toBeDefined();
    const otherClientOptions = otherClient!.clientOptions as {
      listChanged?: { tools?: unknown };
    };
    expect(otherClientOptions.listChanged?.tools).toBeUndefined();

    stdioClient!.listTools
      .mockResolvedValueOnce({
        tools: [{ name: "tool-1" } as Tool],
        nextCursor: "next",
      })
      .mockResolvedValueOnce({
        tools: [{ name: "tool-2" } as Tool],
        nextCursor: undefined,
      });

    await listChanged.listChanged!.tools!.onChanged(null, null);

    expect(stdioClient!.listTools).toHaveBeenCalledTimes(2);
    expect(provider.seenTools).toEqual([
      { name: "tool-1" } as Tool,
      { name: "tool-2" } as Tool,
    ]);
  });

  it("skips annotation scanning when the scanner is disabled", async () => {
    class ToolProvider {
      seenTools: Tool[] | null = null;

      @McpToolListChanged({ clients: ["stdioServer"] })
      handleToolListChanged(tools: Tool[]): void {
        this.seenTools = tools;
      }
    }

    const provider = new ToolProvider();
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [provider],
    };
    const getProviderInstances = vi.spyOn(explorer, "getProviderInstances");
    const registrations: any[] = [];

    const registrar = new McpClientAnnotationRegistrar(
      {
        name: "my-client",
        version: "1.0.0",
        annotationScanner: {
          enabled: false,
        },
        stdio: {
          connections: {
            stdioServer: {
              command: "node",
            },
          },
        },
      },
      registrations,
      explorer,
    );

    await registrar.onModuleInit();

    expect(getProviderInstances).not.toHaveBeenCalled();
    expect(registrations).toHaveLength(1);

    const [client] = constructedClients;
    expect(client?.clientOptions).toMatchObject({ listChanged: undefined });
  });

  it("closes connected clients on module destroy", async () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [],
    };
    const registrations: any[] = [];

    const registrar = new McpClientAnnotationRegistrar(
      {
        name: "my-client",
        version: "1.0.0",
        stdio: {
          connections: {
            stdioServer: {
              command: "node",
            },
          },
        },
      },
      registrations,
      explorer,
    );

    await registrar.onModuleInit();
    await registrar.onModuleDestroy();

    expect(constructedClients).toHaveLength(1);
    expect(constructedClients[0]?.close).toHaveBeenCalledTimes(1);
  });
});
