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

import {
  type McpServer,
  StdioServerTransport,
} from "@modelcontextprotocol/server";
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { MCP_SERVER_TOKEN } from "../module/mcp-server.tokens.js";

@Injectable()
export class McpServerStdioService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private transport: StdioServerTransport | null = null;

  constructor(
    @Inject(MCP_SERVER_TOKEN)
    private readonly mcpServer: McpServer,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.mcpServer.connect(this.transport);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.transport != null) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
