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
  StdioClientTransport,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import type { INestApplication } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { expect } from "vitest";

import {
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
  MCP_SERVER_TOKEN,
  McpServerModule,
  type McpServerModuleOptions,
} from "../../../index.js";
import { McpServerStreamableHttpService } from "../../../transport/streamable-http/index.js";
import {
  PROMPT_NAME,
  PROMPT_TEXT,
  PromptFixtureModule,
  SERVER_INFO,
} from "../fixtures/prompt-fixture.js";

export async function bootstrapHttpClient(
  adapter: "express" | "fastify",
): Promise<{
  app: INestApplication;
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      McpServerModule.forRootAsync({
        imports: [PromptFixtureModule],
        useFactory: () => ({
          mcpServer: new McpServer(SERVER_INFO),
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

  const app =
    adapter === "fastify"
      ? moduleRef.createNestApplication(new FastifyAdapter())
      : moduleRef.createNestApplication();

  await app.init();
  if (adapter === "fastify") {
    await (
      app.getHttpAdapter().getInstance() as {
        ready: () => Promise<void>;
      }
    ).ready();
  }

  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address() as AddressInfo | string | null;
  if (address == null || typeof address === "string") {
    throw new Error("Failed to determine HTTP server port");
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}/mcp`),
  );
  const client = new Client({
    name: `mcp-server-http-test-${adapter}-${randomUUID()}`,
    version: "1.0.0",
  });
  await client.connect(transport);

  return {
    app,
    client,
    transport,
  };
}

export async function bootstrapStdioClient(fixtureUrl: string): Promise<{
  client: Client;
  transport: StdioClientTransport;
}> {
  const client = new Client({
    name: `mcp-server-stdio-test-${randomUUID()}`,
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", fixtureUrl],
  });

  await client.connect(transport);

  return {
    client,
    transport,
  };
}

export async function assertGreetingPrompt(client: Client): Promise<void> {
  const { prompts } = await client.listPrompts({});
  expect(prompts).toHaveLength(1);
  expect(prompts[0]).toMatchObject({
    name: PROMPT_NAME,
    description: "Return a greeting prompt",
  });

  const { messages } = await client.getPrompt({ name: PROMPT_NAME });
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({
    role: "assistant",
    content: {
      type: "text",
      text: PROMPT_TEXT,
    },
  });
}
