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

import { readFile } from "node:fs/promises";

import {
  type Client as McpClient,
  StreamableHTTPClientTransport,
  StdioClientTransport,
  type Implementation,
  type StdioServerParameters,
  type StreamableHTTPClientTransportOptions,
} from "@modelcontextprotocol/client";
import type { InjectionToken, ModuleMetadata } from "@nestjs/common";

export const DEFAULT_MCP_CLIENT_NAME = "spring-ai-mcp-client";
export const DEFAULT_MCP_CLIENT_VERSION = "1.0.0";
export const DEFAULT_STREAMABLE_HTTP_ENDPOINT = "/mcp";

export interface McpClientAnnotationScannerOptions {
  /**
   * Enables discovery and registration of MCP client annotations.
   *
   * Defaults to `true`.
   */
  enabled?: boolean;
}

export interface McpClientStdioConnectionOptions extends StdioServerParameters {}

export interface McpClientStdioOptions {
  /**
   * Optional Claude Desktop-style JSON configuration file containing `mcpServers`.
   */
  serversConfiguration?: string | URL;

  /**
   * Named stdio connection configurations.
   */
  connections?: Record<string, McpClientStdioConnectionOptions>;
}

export interface McpClientStreamableHttpConnectionOptions extends StreamableHTTPClientTransportOptions {
  url: string | URL;

  /**
   * Streamable HTTP endpoint path. Defaults to `/mcp`.
   */
  endpoint?: string;
}

export interface McpClientStreamableHttpOptions {
  connections?: Record<string, McpClientStreamableHttpConnectionOptions>;
}

export interface McpClientModuleOptions {
  /**
   * Client name prefix used to build the SDK client identity.
   */
  name?: string;

  /**
   * Client version used to build the SDK client identity.
   */
  version?: string;

  /**
   * Standard I/O transport configuration.
   */
  stdio?: McpClientStdioOptions;

  /**
   * Streamable HTTP transport configuration.
   */
  streamableHttp?: McpClientStreamableHttpOptions;

  /**
   * Controls whether annotation scanning is enabled on application bootstrap.
   *
   * Defaults to `true`.
   */
  annotationScanner?: McpClientAnnotationScannerOptions;
}

export interface McpClientModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<McpClientModuleOptions> | McpClientModuleOptions;
  global?: boolean;
}

export interface McpClientRegistration {
  clientName: string;
  mcpClient: McpClient;
}

export type McpClientConnectionSpec =
  | {
      clientName: string;
      clientInfo: Implementation;
      transportType: "stdio";
      transportOptions: McpClientStdioConnectionOptions;
    }
  | {
      clientName: string;
      clientInfo: Implementation;
      transportType: "streamable-http";
      transportOptions: McpClientStreamableHttpConnectionOptions;
    };

interface ClaudeDesktopServersConfiguration {
  mcpServers?: Record<string, McpClientStdioConnectionOptions>;
}

function connectedClientName(
  clientName: string,
  connectionName: string,
): string {
  return `${clientName} - ${connectionName}`;
}

function normalizeClientName(name: string | undefined): string {
  const normalizedName = name?.trim() ?? DEFAULT_MCP_CLIENT_NAME;
  if (normalizedName.length === 0) {
    throw new Error("name must not be empty");
  }

  return normalizedName;
}

function normalizeClientVersion(version: string | undefined): string {
  const normalizedVersion = version?.trim() ?? DEFAULT_MCP_CLIENT_VERSION;
  if (normalizedVersion.length === 0) {
    throw new Error("version must not be empty");
  }

  return normalizedVersion;
}

function resolveUrl(baseUrl: string | URL, endpoint: string): URL {
  return new URL(endpoint, baseUrl);
}

async function loadServersConfiguration(
  serversConfiguration: string | URL,
): Promise<Record<string, McpClientStdioConnectionOptions>> {
  const rawConfiguration = await readFile(serversConfiguration, "utf8");
  const parsedConfiguration = JSON.parse(
    rawConfiguration,
  ) as ClaudeDesktopServersConfiguration;

  return parsedConfiguration.mcpServers ?? {};
}

export async function normalizeMcpClientConnectionSpecs(
  options: McpClientModuleOptions,
): Promise<McpClientConnectionSpec[]> {
  const clientName = normalizeClientName(options.name);
  const version = normalizeClientVersion(options.version);

  const specs: McpClientConnectionSpec[] = [];
  const seenConnectionNames = new Set<string>();

  const stdioConnections: Record<string, McpClientStdioConnectionOptions> = {
    ...options.stdio?.connections,
  };
  if (options.stdio?.serversConfiguration != null) {
    const configuredServers = await loadServersConfiguration(
      options.stdio.serversConfiguration,
    );
    for (const [connectionName, connectionOptions] of Object.entries(
      configuredServers,
    )) {
      if (stdioConnections[connectionName] != null) {
        throw new Error(
          `Duplicate stdio MCP client connection name "${connectionName}"`,
        );
      }
      stdioConnections[connectionName] = connectionOptions;
    }
  }

  for (const [connectionName, connectionOptions] of Object.entries(
    stdioConnections,
  )) {
    specs.push({
      clientName: connectionName,
      clientInfo: {
        name: connectedClientName(clientName, connectionName),
        version,
      },
      transportType: "stdio",
      transportOptions: connectionOptions,
    });
    seenConnectionNames.add(connectionName);
  }

  for (const [connectionName, connectionOptions] of Object.entries(
    options.streamableHttp?.connections ?? {},
  )) {
    if (seenConnectionNames.has(connectionName)) {
      throw new Error(
        `Duplicate MCP client connection name "${connectionName}"`,
      );
    }

    specs.push({
      clientName: connectionName,
      clientInfo: {
        name: connectedClientName(clientName, connectionName),
        version,
      },
      transportType: "streamable-http",
      transportOptions: connectionOptions,
    });
    seenConnectionNames.add(connectionName);
  }

  if (specs.length === 0) {
    throw new Error(
      "At least one MCP client transport connection must be configured",
    );
  }

  return specs;
}

export function createMcpClientTransport(
  spec: McpClientConnectionSpec,
): StdioClientTransport | StreamableHTTPClientTransport {
  switch (spec.transportType) {
    case "stdio":
      return new StdioClientTransport(spec.transportOptions);
    case "streamable-http": {
      const { url, endpoint, ...transportOptions } = spec.transportOptions;
      return new StreamableHTTPClientTransport(
        resolveUrl(url, endpoint ?? DEFAULT_STREAMABLE_HTTP_ENDPOINT),
        transportOptions,
      );
    }
    default:
      throw new Error("Unsupported MCP client transport type");
  }
}
