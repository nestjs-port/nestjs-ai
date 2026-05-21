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

import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import {
  registerTestHandlers,
  TEST_SERVER_INFO,
} from "../support/mcp-test-server.js";

async function bootstrap(): Promise<void> {
  const mcpServer = new McpServer(TEST_SERVER_INFO);
  registerTestHandlers(mcpServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  const keepAlive = setInterval(() => undefined, 60_000);
  const shutdown = async (): Promise<void> => {
    clearInterval(keepAlive);
    await transport.close().catch(() => undefined);
  };

  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  await new Promise<void>(() => undefined);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
