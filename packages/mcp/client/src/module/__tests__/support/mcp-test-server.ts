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

import { createServer, type IncomingMessage, type Server } from "node:http";
import { once } from "node:events";
import { Readable } from "node:stream";

import {
  McpServer,
  type Implementation,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";

export const TEST_SERVER_INFO: Implementation = {
  name: "nestjs-ai-mcp-client-test-server",
  version: "1.0.0",
};

export const TEST_PROMPT_NAME = "greeting";
export const TEST_PROMPT_TEXT = "Hello from MCP";
export const TEST_RESOURCE_NAME = "config";
export const TEST_RESOURCE_URI = "config://app";
export const TEST_RESOURCE_TEXT = "App configuration here";
export const TEST_TOOL_NAME = "echo";
export const TEST_TOOL_TEXT = "tool-response";

export function registerTestHandlers(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    TEST_PROMPT_NAME,
    {
      description: "Return a greeting prompt",
    },
    async () => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: TEST_PROMPT_TEXT,
          },
        },
      ],
    }),
  );

  mcpServer.registerResource(
    TEST_RESOURCE_NAME,
    TEST_RESOURCE_URI,
    {
      mimeType: "text/plain",
      description: "Return a static config resource",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: TEST_RESOURCE_TEXT,
        },
      ],
    }),
  );

  mcpServer.registerTool(
    TEST_TOOL_NAME,
    {
      description: "Return a fixed tool response",
    },
    async () => ({
      content: [
        {
          type: "text",
          text: TEST_TOOL_TEXT,
        },
      ],
    }),
  );
}

export async function startStreamableHttpTestServer(
  register: (mcpServer: McpServer) => void = registerTestHandlers,
): Promise<{
  baseUrl: URL;
  close: () => Promise<void>;
}> {
  const mcpServer = new McpServer(TEST_SERVER_INFO);
  register(mcpServer);

  const transport = new WebStandardStreamableHTTPServerTransport();
  await mcpServer.connect(transport);

  const server = createServer(async (req, res) => {
    try {
      const request = await toRequest(req);
      const response = await transport.handleRequest(request);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (response.body == null) {
        res.end();
        return;
      }

      Readable.fromWeb(response.body as any).pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error),
          },
          id: null,
        }),
      );
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("Failed to determine HTTP server port");
  }

  return {
    baseUrl: new URL(`http://127.0.0.1:${address.port}`),
    close: async () => {
      await transport.close().catch(() => undefined);
      await closeServer(server);
    },
  };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "127.0.0.1"}`,
  );

  const init: RequestInit = {
    method: req.method ?? "GET",
    headers: req.headers as HeadersInit,
  };

  if (!["GET", "HEAD", "DELETE"].includes(req.method ?? "GET")) {
    init.body = (await readBody(req)) as any;
  }

  return new Request(url, init);
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error != null) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
