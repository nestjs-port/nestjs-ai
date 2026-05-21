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

import { fileURLToPath } from "node:url";

import {
  Client,
  type CreateMessageRequest,
  type CreateMessageResult,
  type ElicitRequest,
  type ElicitResult,
  type LoggingMessageNotification,
  type ProgressNotification,
  type Tool,
} from "@modelcontextprotocol/client";
import type { Provider } from "@nestjs/common";
import {
  McpElicitation,
  McpLogging,
  McpProgress,
  McpSampling,
  McpToolListChanged,
} from "@nestjs-ai/mcp-annotations";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import { Test, type TestingModule } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import {
  McpClientCustomizer,
  McpToolCallbackProvider,
} from "@nestjs-ai/mcp-common";
import { TOOL_CALLBACK_PROVIDER_TOKEN } from "@nestjs-ai/commons";

import { McpClientModule } from "../mcp-client.module.js";
import {
  MCP_CLIENT_REGISTRATIONS_TOKEN,
  MCP_TOOL_FILTER_TOKEN,
  MCP_TOOL_NAME_PREFIX_GENERATOR_TOKEN,
} from "../mcp-client.tokens.js";
import type {
  McpClientModuleOptions,
  McpClientRegistration,
  McpClientStdioConnectionOptions,
} from "../mcp-client-module.options.js";
import {
  TEST_PROMPT_NAME,
  TEST_PROMPT_TEXT,
  TEST_RESOURCE_TEXT,
  TEST_RESOURCE_URI,
  TEST_TOOL_NAME,
  TEST_TOOL_TEXT,
  startStreamableHttpTestServer,
} from "./support/mcp-test-server.js";

class MatchingToolListChangedProvider {
  @McpToolListChanged({
    clients: ["stdio-server"],
  })
  onToolsChanged(_tools: Tool[]): void {}
}

class MatchingClientSideAnnotationsProvider {
  @McpLogging({
    clients: ["stdio-server"],
  })
  onLoggingMessage(_notification: LoggingMessageNotification): void {}

  @McpProgress({
    clients: ["stdio-server"],
  })
  onProgress(_notification: ProgressNotification): void {}

  @McpSampling({
    clients: ["stdio-server"],
  })
  onSampling(_request: CreateMessageRequest): CreateMessageResult {
    return {
      role: "assistant",
      content: {
        type: "text",
        text: "sample-response",
      },
      model: "sample-model",
    };
  }

  @McpElicitation({
    clients: ["stdio-server"],
  })
  onElicitation(_request: ElicitRequest): ElicitResult {
    return {
      action: "accept",
      content: {
        message: "elicitation-response",
      },
    };
  }
}

describe("McpClientAnnotationRegistrar", () => {
  it("creates real clients from stdio and streamable-http connections", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const { moduleRef, registrations } = await bootstrapClientModule({
      annotationScanner: {
        enabled: false,
      },
      stdio: {
        connections: {
          "stdio-server": createStdioConnection(),
        },
      },
      streamableHttp: {
        connections: {
          "http-server": {
            url: httpServer.baseUrl,
          },
        },
      },
    });

    try {
      expect(registrations).toHaveLength(2);

      const stdioClient = getClient(registrations, "stdio-server");
      const httpClient = getClient(registrations, "http-server");

      await expect(stdioClient.listPrompts({})).resolves.toMatchObject({
        prompts: [
          {
            name: TEST_PROMPT_NAME,
            description: "Return a greeting prompt",
          },
        ],
      });
      await expect(
        stdioClient.getPrompt({ name: TEST_PROMPT_NAME }),
      ).resolves.toMatchObject({
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: TEST_PROMPT_TEXT,
            },
          },
        ],
      });
      await expect(stdioClient.listResources({})).resolves.toMatchObject({
        resources: [
          {
            uri: TEST_RESOURCE_URI,
          },
        ],
      });
      await expect(
        stdioClient.readResource({ uri: TEST_RESOURCE_URI }),
      ).resolves.toMatchObject({
        contents: [
          {
            uri: TEST_RESOURCE_URI,
            text: TEST_RESOURCE_TEXT,
          },
        ],
      });
      await expect(stdioClient.listTools({})).resolves.toMatchObject({
        tools: [
          {
            name: TEST_TOOL_NAME,
            description: "Return a fixed tool response",
          },
        ],
      });
      await expect(
        stdioClient.callTool({ name: TEST_TOOL_NAME, arguments: {} }),
      ).resolves.toMatchObject({
        content: [
          {
            type: "text",
            text: TEST_TOOL_TEXT,
          },
        ],
      });

      await expect(httpClient.listPrompts({})).resolves.toMatchObject({
        prompts: [
          {
            name: TEST_PROMPT_NAME,
            description: "Return a greeting prompt",
          },
        ],
      });
      await expect(
        httpClient.getPrompt({ name: TEST_PROMPT_NAME }),
      ).resolves.toMatchObject({
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: TEST_PROMPT_TEXT,
            },
          },
        ],
      });
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("populates tool callbacks from connected clients", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const { moduleRef, registrations, toolCallbackProvider } =
      await bootstrapClientModule({
        annotationScanner: {
          enabled: false,
        },
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
        streamableHttp: {
          connections: {
            "http-server": {
              url: httpServer.baseUrl,
            },
          },
        },
      });

    try {
      expect(registrations).toHaveLength(2);
      expect(toolCallbackProvider.toolCallbacks).toHaveLength(2);
      expect(
        toolCallbackProvider.toolCallbacks.map(
          (callback) => callback.toolDefinition.name,
        ),
      ).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(moduleRef.get(McpToolCallbackProvider)).toBe(toolCallbackProvider);
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("does not register the tool callback provider when disabled", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const { moduleRef, registrations } = await bootstrapClientModule({
      toolCallback: {
        enabled: false,
      },
      annotationScanner: {
        enabled: false,
      },
      stdio: {
        connections: {
          "stdio-server": createStdioConnection(),
        },
      },
      streamableHttp: {
        connections: {
          "http-server": {
            url: httpServer.baseUrl,
          },
        },
      },
    });

    try {
      expect(registrations).toHaveLength(2);
      expect(moduleRef.get(TOOL_CALLBACK_PROVIDER_TOKEN)).toEqual([]);
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("uses injected tool filter and prefix generator when provided", async () => {
    const httpServer = await startStreamableHttpTestServer();

    const toolFilter = {
      test(connectionInfo: { clientInfo: { name: string } }): boolean {
        return connectionInfo.clientInfo.name.includes("http-server");
      },
    };

    const toolNamePrefixGenerator = {
      prefixedToolName(_connectionInfo: unknown, tool: Tool): string {
        return `custom_${tool.name}`;
      },
    };

    const { moduleRef, toolCallbackProvider } = await bootstrapClientModule(
      {
        annotationScanner: {
          enabled: false,
        },
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
        streamableHttp: {
          connections: {
            "http-server": {
              url: httpServer.baseUrl,
            },
          },
        },
      },
      [],
      () => [],
      [
        {
          provide: MCP_TOOL_FILTER_TOKEN,
          useValue: toolFilter,
        },
        {
          provide: MCP_TOOL_NAME_PREFIX_GENERATOR_TOKEN,
          useValue: toolNamePrefixGenerator,
        },
      ],
      undefined,
    );

    try {
      const callbacks = toolCallbackProvider.toolCallbacks;

      expect(callbacks).toHaveLength(1);
      expect(callbacks[0]?.toolDefinition.name).toBe(
        `custom_${TEST_TOOL_NAME}`,
      );
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("applies customizers to each created client", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const customize = vi.fn<(name: string, client: Client) => void>();
    const customizer = {
      customize,
    } satisfies McpClientCustomizer;

    const { moduleRef, registrations } = await bootstrapClientModule(
      {
        annotationScanner: {
          enabled: false,
        },
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
        streamableHttp: {
          connections: {
            "http-server": {
              url: httpServer.baseUrl,
            },
          },
        },
      },
      [],
      () => [],
      [],
      {
        provide: McpClientCustomizer,
        useFactory: () => customizer,
      },
    );

    try {
      expect(registrations).toHaveLength(2);
      expect(customize).toHaveBeenCalledTimes(2);
      expect(customize.mock.calls.map(([name]) => name)).toEqual([
        "stdio-server",
        "http-server",
      ]);
      expect(customize.mock.calls[0]?.[1]).toBeDefined();
      expect(customize.mock.calls[1]?.[1]).toBeDefined();
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("registers client-side annotation handlers and capabilities", async () => {
    const clientPrototype = Client.prototype as any;
    const setRequestHandlerSpy = vi.spyOn(clientPrototype, "setRequestHandler");
    const setNotificationHandlerSpy = vi.spyOn(
      clientPrototype,
      "setNotificationHandler",
    );
    const registerCapabilitiesSpy = vi.spyOn(
      clientPrototype,
      "registerCapabilities",
    );

    const provider = new MatchingClientSideAnnotationsProvider();
    const { moduleRef, registrations } = await bootstrapClientModule(
      {
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
      },
      [provider],
    );

    try {
      expect(registrations).toHaveLength(1);
      expect(registerCapabilitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sampling: {},
          elicitation: {},
        }),
      );

      const requestHandlerCalls = setRequestHandlerSpy.mock.calls as Array<
        [string, ...unknown[]]
      >;
      expect(requestHandlerCalls.map((call) => call[0])).toEqual(
        expect.arrayContaining([
          "sampling/createMessage",
          "elicitation/create",
        ]),
      );

      const notificationHandlerCalls = setNotificationHandlerSpy.mock
        .calls as Array<[string, ...unknown[]]>;
      expect(notificationHandlerCalls.map((call) => call[0])).toEqual(
        expect.arrayContaining([
          "notifications/message",
          "notifications/progress",
        ]),
      );
      expect(
        notificationHandlerCalls.filter(
          (call) => call[0] === "notifications/progress",
        ),
      ).toHaveLength(2);
    } finally {
      await moduleRef.close();
      setRequestHandlerSpy.mockRestore();
      setNotificationHandlerSpy.mockRestore();
      registerCapabilitiesSpy.mockRestore();
    }
  }, 30_000);

  it("registers changed handlers only for the matching connection name", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const provider = new MatchingToolListChangedProvider();
    const { moduleRef, registrations } = await bootstrapClientModule(
      {
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
        streamableHttp: {
          connections: {
            "http-server": {
              url: httpServer.baseUrl,
            },
          },
        },
      },
      [provider],
    );

    try {
      expect(registrations).toHaveLength(2);

      const stdioClient = getClient(registrations, "stdio-server");
      const httpClient = getClient(registrations, "http-server");
      const stdioClientOptions = getClientOptions(stdioClient);
      const httpClientOptions = getClientOptions(httpClient);

      expect(stdioClientOptions.listChanged).toBeDefined();
      expect(httpClientOptions.listChanged).toEqual({});
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("refreshes tool callbacks after tool list change notifications", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const provider = new MatchingToolListChangedProvider();
    const { moduleRef, registrations, toolCallbackProvider } =
      await bootstrapClientModule(
        {
          stdio: {
            connections: {
              "stdio-server": createStdioConnection(),
            },
          },
          streamableHttp: {
            connections: {
              "http-server": {
                url: httpServer.baseUrl,
              },
            },
          },
        },
        [provider],
      );

    try {
      const refreshSpy = vi.spyOn(toolCallbackProvider, "refresh");
      const stdioClient = getClient(registrations, "stdio-server");
      const listChanged = getClientOptions(stdioClient).listChanged as {
        tools?: {
          onChanged?: (
            error: Error | null,
            tools?: Tool[] | null,
          ) => Promise<void>;
        };
      };

      await listChanged.tools?.onChanged?.(null, []);

      expect(refreshSpy).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("skips annotation scanning when the scanner is disabled", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const provider = new MatchingToolListChangedProvider();
    const getProviderInstances = vi.fn(() => [provider]);
    const { moduleRef, registrations } = await bootstrapClientModule(
      {
        annotationScanner: {
          enabled: false,
        },
        stdio: {
          connections: {
            "stdio-server": createStdioConnection(),
          },
        },
        streamableHttp: {
          connections: {
            "http-server": {
              url: httpServer.baseUrl,
            },
          },
        },
      },
      [provider],
      getProviderInstances,
    );

    try {
      expect(getProviderInstances).not.toHaveBeenCalled();
      expect(registrations).toHaveLength(2);

      const stdioClient = getClient(registrations, "stdio-server");
      expect(getClientOptions(stdioClient).listChanged).toBeUndefined();
    } finally {
      await moduleRef.close();
      await httpServer.close();
    }
  }, 30_000);

  it("closes connected clients on module destroy", async () => {
    const httpServer = await startStreamableHttpTestServer();
    const { moduleRef, registrations } = await bootstrapClientModule({
      stdio: {
        connections: {
          "stdio-server": createStdioConnection(),
        },
      },
      streamableHttp: {
        connections: {
          "http-server": {
            url: httpServer.baseUrl,
          },
        },
      },
    });

    try {
      const stdioClient = getClient(registrations, "stdio-server");
      const httpClient = getClient(registrations, "http-server");
      const stdioCloseSpy = vi.spyOn(stdioClient, "close");
      const httpCloseSpy = vi.spyOn(httpClient, "close");

      await moduleRef.close();

      expect(stdioCloseSpy).toHaveBeenCalledTimes(1);
      expect(httpCloseSpy).toHaveBeenCalledTimes(1);
    } finally {
      await httpServer.close();
    }
  }, 30_000);
});

async function bootstrapClientModule(
  options: McpClientModuleOptions,
  providerInstances: object[] = [],
  getProviderInstances: () => object[] = () => providerInstances,
  extraProviders: Provider[] = [],
  customizerProvider?: Provider<McpClientCustomizer>,
): Promise<{
  moduleRef: TestingModule;
  registrations: McpClientRegistration[];
  toolCallbackProvider: McpToolCallbackProvider;
}> {
  const supportModule = {
    module: class McpClientTestSupportModule {},
    exports: [
      PROVIDER_INSTANCE_EXPLORER_TOKEN,
      TOOL_CALLBACK_PROVIDER_TOKEN,
      ...extraProviders.map(resolveProviderToken),
    ],
    providers: [
      {
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useValue: {
          getProviderInstances,
        },
      },
      {
        provide: TOOL_CALLBACK_PROVIDER_TOKEN,
        useValue: [],
      },
      ...extraProviders,
    ],
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      McpClientModule.forRootAsync({
        imports: [supportModule],
        useFactory: () => options,
        customizerProvider,
      }),
    ],
  }).compile();

  await moduleRef.init();

  return {
    moduleRef,
    registrations: moduleRef.get(MCP_CLIENT_REGISTRATIONS_TOKEN),
    toolCallbackProvider: moduleRef.get(McpToolCallbackProvider),
  };
}

function createStdioConnection(): McpClientStdioConnectionOptions {
  const fixtureUrl = fileURLToPath(
    new URL("./fixtures/stdio-test-server.fixture.ts", import.meta.url),
  );

  return {
    command: process.execPath,
    args: ["--import", "tsx", fixtureUrl],
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
  };
}

function getClient(
  registrations: McpClientRegistration[],
  clientName: string,
): Client {
  const registration = registrations.find(
    (candidate) => candidate.clientName === clientName,
  );

  if (registration == null) {
    throw new Error(`Missing client registration for "${clientName}"`);
  }

  return registration.mcpClient as Client;
}

function getClientOptions(client: Client): {
  listChanged?: unknown;
} {
  return (
    (client as unknown as { _options?: { listChanged?: unknown } })._options ??
    {}
  );
}

function resolveProviderToken(provider: Provider): string | symbol | Function {
  if (typeof provider === "function") {
    return provider;
  }

  return (provider as { provide: string | symbol | Function }).provide;
}
