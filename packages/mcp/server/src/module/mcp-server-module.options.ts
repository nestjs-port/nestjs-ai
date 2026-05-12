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

import type {
  Implementation,
  McpServer,
  ServerOptions,
} from "@modelcontextprotocol/server";
import type { InjectionToken, ModuleMetadata } from "@nestjs/common";

export type McpServerTransportType = "stdio" | "streamable-http";

export const DEFAULT_STREAMABLE_HTTP_ENDPOINT = "mcp";

export interface McpServerStreamableHttpOptions {
  /**
   * When `true`, the server runs without session management (no
   * `Mcp-Session-Id` header on responses, no session validation).
   *
   * Defaults to `false` (stateful mode).
   */
  statelessMode?: boolean;

  /**
   * When `true`, simple JSON responses are returned for non-streaming
   * requests instead of SSE.
   */
  enableJsonResponse?: boolean;

  /**
   * Generates session identifiers in stateful mode. Ignored when
   * `statelessMode` is `true`.
   *
   * Defaults to `crypto.randomUUID`.
   */
  sessionIdGenerator?: () => string;
}

export interface McpServerAnnotationRegistrationOptions {
  /**
   * Enables discovery and registration of server-side MCP annotations.
   * When disabled, no annotated server methods are registered.
   */
  enabled?: boolean;
}

export interface McpServerModuleOptions {
  /**
   * Existing MCP server instance to register discovered annotations against.
   *
   * When omitted, the module creates a new SDK `McpServer` from `serverInfo`.
   */
  mcpServer?: McpServer;

  /**
   * SDK server identity used when the module creates the MCP server.
   */
  serverInfo?: Implementation;

  /**
   * SDK server options used when the module creates the MCP server.
   */
  serverOptions?: ServerOptions;

  /**
   * Controls which annotation families are auto-registered on application
   * bootstrap.
   */
  annotations?: McpServerAnnotationRegistrationOptions;

  /**
   * Streamable HTTP transport configuration. Only consulted when the module
   * is configured with `transport: "streamable-http"`.
   */
  streamableHttp?: McpServerStreamableHttpOptions;
}

/**
 * Synchronous-only options that influence module metadata (controllers, route
 * paths) and therefore cannot be deferred to an async factory.
 */
export interface McpServerModuleSyncTransportOptions {
  /**
   * Transport to bind to the MCP server. Defaults to `"streamable-http"`.
   */
  transport?: McpServerTransportType;

  /**
   * HTTP endpoint path for the streamable-http controller. Ignored for
   * `transport: "stdio"`.
   *
   * Defaults to `"mcp"`.
   */
  endpoint?: string;
}

/**
 * Options resolved asynchronously through `useFactory`. The transport-shape
 * options live on {@link McpServerModuleAsyncOptions} directly because
 * controller registration must happen synchronously at module definition time.
 */
export type McpServerAsyncFactoryOptions = Omit<McpServerModuleOptions, never>;

export interface McpServerModuleAsyncOptions extends McpServerModuleSyncTransportOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<McpServerAsyncFactoryOptions> | McpServerAsyncFactoryOptions;
  global?: boolean;
}
