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

import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { Injectable, Module, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it } from "vitest";
import {
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
  MCP_SERVER_TOKEN,
} from "../mcp-server.tokens.js";
import { McpServerModule } from "../mcp-server.module.js";
import type { McpServerModuleOptions } from "../mcp-server-module.options.js";
import { McpServerStreamableHttpService } from "../../transport/streamable-http.service.js";
import { TOOL_CALLBACK_PROVIDER_TOKEN } from "@nestjs-ai/commons";
import { ToolCallback, type ToolCallbackProvider } from "@nestjs-ai/model";

const SERVER_INFO = {
  name: "nestjs-ai-mcp-tool-server",
  version: "1.0.0",
} as const;

const TOOL_NAME = "echo";
const TOOL_DESCRIPTION = "Echo the provided tool input";

class EchoToolCallback extends ToolCallback {
  override get toolDefinition() {
    return {
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      inputSchema:
        '{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}',
    };
  }
}

@Injectable()
class EchoToolProvider implements ToolCallbackProvider {
  private readonly _toolCallbacks = [new EchoToolCallback()];

  get toolCallbacks(): ToolCallback[] {
    return this._toolCallbacks;
  }
}

@Module({
  providers: [
    EchoToolProvider,
    {
      provide: TOOL_CALLBACK_PROVIDER_TOKEN,
      useFactory: (
        echoToolProvider: EchoToolProvider,
      ): ToolCallbackProvider[] => [echoToolProvider],
      inject: [EchoToolProvider],
    },
  ],
  exports: [TOOL_CALLBACK_PROVIDER_TOKEN],
})
class ToolCallbackFixtureModule {}

async function bootstrapToolHttpClient(): Promise<{
  app: INestApplication;
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      McpServerModule.forRootAsync({
        imports: [ToolCallbackFixtureModule],
        useFactory: () => ({
          mcpServer: new McpServer(SERVER_INFO),
          toolCallbacks: {
            enabled: true,
          },
        }),
      }),
    ],
  })
    .overrideProvider(McpServerStreamableHttpService)
    .useFactory({
      factory: (
        mcpServer: McpServer,
        options: McpServerModuleOptions,
      ): McpServerStreamableHttpService =>
        new McpServerStreamableHttpService(mcpServer, options),
      inject: [MCP_SERVER_TOKEN, MCP_SERVER_MODULE_OPTIONS_TOKEN],
    })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address() as AddressInfo | string | null;
  if (address == null || typeof address === "string") {
    throw new Error("Failed to determine HTTP server port");
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}/mcp`),
  );
  const client = new Client({
    name: `mcp-server-tool-http-test-${randomUUID()}`,
    version: "1.0.0",
  });
  await client.connect(transport);

  return {
    app,
    client,
    transport,
  };
}

describe("McpServerModule (tool callback)", () => {
  let app: INestApplication | undefined;
  let client: Client | undefined;
  let transport: StreamableHTTPClientTransport | undefined;

  afterEach(async () => {
    await transport?.terminateSession().catch(() => undefined);
    await client?.close().catch(() => undefined);
    await app?.close();
  });

  it("exposes tool callbacks discovered from provider instances", async () => {
    ({ app, client, transport } = await bootstrapToolHttpClient());

    const { tools } = await client.listTools({});
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
    });

    const { content } = await client.callTool({
      name: TOOL_NAME,
      arguments: { value: "hello" },
    });

    expect(content).toEqual([
      {
        type: "text",
        text: '{"value":"hello"}',
      },
    ]);
  }, 30_000);
});
