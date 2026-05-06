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

export interface McpServerAnnotationRegistrationOptions {
  /**
   * Enables discovery and registration of methods annotated with `@McpPrompt`.
   *
   * Defaults to `true`.
   */
  prompts?: boolean;
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
}

export interface McpServerModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<McpServerModuleOptions> | McpServerModuleOptions;
  global?: boolean;
}
