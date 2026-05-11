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

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  StdioClientTransport,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import {
  createMcpClientTransport,
  normalizeMcpClientConnectionSpecs,
} from "../mcp-client-module.options.js";

describe("normalizeMcpClientConnectionSpecs", () => {
  it("creates connection specs from stdio and streamable-http transports", async () => {
    const specs = await normalizeMcpClientConnectionSpecs({
      name: "my-client",
      version: "1.2.3",
      stdio: {
        connections: {
          stdioServer: {
            command: "node",
            args: ["server.js"],
          },
        },
      },
      streamableHttp: {
        connections: {
          httpServer: {
            url: "http://localhost:9090",
            endpoint: "/mcp",
          },
        },
      },
    });

    expect(specs).toHaveLength(2);
    expect(specs[0]).toMatchObject({
      clientName: "stdioServer",
      clientInfo: { name: "my-client - stdioServer", version: "1.2.3" },
      transportType: "stdio",
      transportOptions: {
        command: "node",
        args: ["server.js"],
      },
    });
    expect(specs[1]).toMatchObject({
      clientName: "httpServer",
      clientInfo: { name: "my-client - httpServer", version: "1.2.3" },
      transportType: "streamable-http",
    });
  });

  it("loads stdio connections from a servers configuration file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nestjs-ai-mcp-"));
    const configurationPath = join(directory, "claude-desktop-config.json");

    await writeFile(
      configurationPath,
      JSON.stringify({
        mcpServers: {
          fileServer: {
            command: "node",
            args: ["server.js"],
          },
        },
      }),
      "utf8",
    );

    const specs = await normalizeMcpClientConnectionSpecs({
      stdio: {
        serversConfiguration: configurationPath,
      },
    });

    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({
      clientName: "fileServer",
      clientInfo: {
        name: "spring-ai-mcp-client - fileServer",
        version: "1.0.0",
      },
      transportType: "stdio",
      transportOptions: {
        command: "node",
        args: ["server.js"],
      },
    });
  });

  it("throws when no transport connections are configured", async () => {
    await expect(normalizeMcpClientConnectionSpecs({})).rejects.toThrowError(
      "At least one MCP client transport connection must be configured",
    );
  });
});

describe("createMcpClientTransport", () => {
  it("creates stdio and streamable HTTP transports", () => {
    const stdio = createMcpClientTransport({
      clientName: "stdioServer",
      clientInfo: { name: "client - stdioServer", version: "1.0.0" },
      transportType: "stdio",
      transportOptions: {
        command: "node",
      },
    });
    const streamableHttp = createMcpClientTransport({
      clientName: "httpServer",
      clientInfo: { name: "client - httpServer", version: "1.0.0" },
      transportType: "streamable-http",
      transportOptions: {
        url: "http://localhost:9090",
      },
    });

    expect(stdio).toBeInstanceOf(StdioClientTransport);
    expect(streamableHttp).toBeInstanceOf(StreamableHTTPClientTransport);
  });
});
