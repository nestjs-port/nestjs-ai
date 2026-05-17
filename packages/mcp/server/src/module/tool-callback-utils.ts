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

import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { ToolCallback, ToolCallbackProvider } from "@nestjs-ai/model";
import { McpToolCallback } from "@nestjs-ai/mcp-common";

export interface AggregateToolCallbacksOptions {
  toolCallbacks: ToolCallback[];
  toolCallbackProviders: ToolCallbackProvider[];
  exposeMcpClientTools: boolean;
}

export abstract class ToolCallbackUtils {
  private static readonly _logger: Logger = LoggerFactory.getLogger(
    ToolCallbackUtils.name,
  );

  private constructor() {}

  static aggregateToolCallbacks(
    options: AggregateToolCallbacksOptions,
  ): ToolCallback[] {
    const directToolCallbacks = options.toolCallbacks.filter(
      (toolCallback) =>
        toolCallback != null &&
        (options.exposeMcpClientTools ||
          !ToolCallbackUtils.isMcpToolCallback(toolCallback)),
    );

    const filteredProviders = Array.from(
      new Set(options.toolCallbackProviders),
    ).filter((toolCallbackProvider) => {
      if (toolCallbackProvider == null) {
        return false;
      }

      return (
        options.exposeMcpClientTools ||
        !ToolCallbackUtils.isMcpToolProvider(toolCallbackProvider)
      );
    });

    const providerToolCallbacks = filteredProviders
      .map((provider) => provider.toolCallbacks)
      .flat()
      .filter((toolCallback) => toolCallback != null);

    const hasExcludedToolProvider = options.toolCallbackProviders.some(
      (toolCallbackProvider) =>
        toolCallbackProvider != null &&
        !options.exposeMcpClientTools &&
        ToolCallbackUtils.isMcpToolProvider(toolCallbackProvider),
    );

    if (hasExcludedToolProvider) {
      ToolCallbackUtils._logger.warn(
        "Found MCP clients. The MCP client tools will not be exposed by the MCP server. If you would like to expose the tools, set exposeMcpClientTools=true.",
      );
    }

    return [...directToolCallbacks, ...providerToolCallbacks];
  }

  static isMcpToolCallback(toolCallback: ToolCallback): boolean {
    return toolCallback instanceof McpToolCallback;
  }

  /**
   * Returns true when a provider exposes at least one MCP tool callback.
   *
   * We use callback inspection here because `McpToolCallbackProvider` does not
   * implement the `ToolCallbackProvider` contract directly in this codebase.
   */
  static isMcpToolProvider(
    toolCallbackProvider: ToolCallbackProvider,
  ): boolean {
    return toolCallbackProvider.toolCallbacks.some((toolCallback) =>
      ToolCallbackUtils.isMcpToolCallback(toolCallback),
    );
  }
}
