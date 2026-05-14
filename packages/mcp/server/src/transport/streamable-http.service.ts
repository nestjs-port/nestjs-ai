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

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type { McpServerModuleOptions } from "../module/index.js";
import {
  MCP_SERVER_MODULE_OPTIONS_TOKEN,
  MCP_SERVER_TOKEN,
} from "../module/index.js";

@Injectable()
export class McpServerStreamableHttpService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private transport: NodeStreamableHTTPServerTransport | null = null;

  constructor(
    @Inject(MCP_SERVER_TOKEN)
    private readonly mcpServer: McpServer,
    @Inject(MCP_SERVER_MODULE_OPTIONS_TOKEN)
    private readonly options: McpServerModuleOptions,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const streamableHttp = this.options.streamableHttp ?? {};
    const stateless = streamableHttp.statelessMode === true;
    const { NodeStreamableHTTPServerTransport } =
      await import("@modelcontextprotocol/node").catch(() => {
        throw new Error(
          "@modelcontextprotocol/node is required when streamable-http transport is enabled",
        );
      });

    this.transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: stateless
        ? undefined
        : (streamableHttp.sessionIdGenerator ?? (() => randomUUID())),
      enableJsonResponse: streamableHttp.enableJsonResponse,
    });

    await this.mcpServer.connect(this.transport);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.transport != null) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    if (this.transport == null) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "MCP transport not ready" },
          id: null,
        }),
      );
      return;
    }
    await this.transport.handleRequest(req, res, parsedBody);
  }
}
