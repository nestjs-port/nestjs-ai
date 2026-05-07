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

import assert from "node:assert/strict";

import type { Client as McpClient } from "@modelcontextprotocol/client";
import type { InjectionToken, ModuleMetadata } from "@nestjs/common";

export interface McpClientAnnotationRegistrationOptions {
  /**
   * Enables discovery and registration of methods annotated with `@McpSampling`.
   *
   * Defaults to `true`.
   */
  sampling?: boolean;
}

export interface McpClientRegistration {
  clientName: string;
  mcpClient: McpClient;
}

export interface McpClientModuleOptions {
  /**
   * Existing MCP client instances to register discovered annotations against.
   * Each entry is associated with a logical client or connection name.
   */
  clients?: McpClientRegistration[];

  /**
   * Convenience fields for registering a single client without wrapping it in
   * an array.
   */
  clientName?: string;
  mcpClient?: McpClient;

  /**
   * Controls which annotation families are auto-registered on application bootstrap.
   */
  annotations?: McpClientAnnotationRegistrationOptions;
}

export interface McpClientModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<McpClientModuleOptions> | McpClientModuleOptions;
  global?: boolean;
}

export function normalizeMcpClientRegistrations(
  options: McpClientModuleOptions,
): McpClientRegistration[] {
  if (options.clients != null) {
    if (options.clients.length === 0) {
      throw new Error("clients must not be empty");
    }

    return options.clients.map((client) => {
      assert(client.clientName != null, "clientName must not be null");
      if (client.clientName.trim().length === 0) {
        throw new Error("clientName must not be empty");
      }
      assert(client.mcpClient != null, "mcpClient must not be null");

      return {
        clientName: client.clientName,
        mcpClient: client.mcpClient,
      };
    });
  }

  if (options.mcpClient != null) {
    if (options.clientName == null || options.clientName.trim().length === 0) {
      throw new Error(
        "clientName must be provided when mcpClient is configured",
      );
    }

    return [
      {
        clientName: options.clientName,
        mcpClient: options.mcpClient,
      },
    ];
  }

  throw new Error("Either clients or mcpClient must be provided");
}
