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

import type { McpServer } from "@modelcontextprotocol/server";
import type {
  CallToolResult,
  ServerContext,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import { McpServerExchange } from "@nestjs-ai/mcp-common";
import type { ToolCallback } from "@nestjs-ai/model";
import { ToolContext } from "@nestjs-ai/model";
import type { ToolRegistration } from "@nestjs-ai/mcp-annotations";

export abstract class McpServerToolUtils {
  private static readonly _logger: Logger = LoggerFactory.getLogger(
    McpServerToolUtils.name,
  );

  private constructor() {}

  static toToolRegistrations(
    mcpServer: McpServer,
    toolCallbacks: ToolCallback[],
  ): ToolRegistration[] {
    return toolCallbacks.map((toolCallback) =>
      McpServerToolUtils.toToolRegistration(mcpServer, toolCallback),
    );
  }

  static toToolRegistration(
    mcpServer: McpServer,
    toolCallback: ToolCallback,
  ): ToolRegistration {
    const toolDefinition = toolCallback.toolDefinition;
    const inputSchema = McpServerToolUtils.createStandardSchema(
      McpServerToolUtils.parseInputSchema(toolDefinition.inputSchema),
    ) as StandardSchemaWithJSON;

    return [
      toolDefinition.name,
      {
        description: toolDefinition.description,
        inputSchema,
      },
      async (args: Record<string, unknown> | undefined, ctx: ServerContext) => {
        const exchange = new McpServerExchange(mcpServer, ctx);
        const toolContext = new ToolContext({ exchange });
        try {
          const result = await toolCallback.call(
            JSON.stringify(args ?? {}),
            toolContext,
          );
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: message }],
            isError: true,
          } satisfies CallToolResult;
        }
      },
    ];
  }

  private static parseInputSchema(inputSchema: string): unknown {
    try {
      return JSON.parse(inputSchema) as unknown;
    } catch (error) {
      throw new Error(
        `Invalid tool input schema: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private static createStandardSchema(inputSchema: unknown): unknown {
    return {
      "~standard": {
        version: 1,
        vendor: "nestjs-ai",
        validate(value: unknown) {
          return { value };
        },
        jsonSchema: {
          input() {
            return inputSchema as Record<string, unknown>;
          },
          output() {
            return inputSchema as Record<string, unknown>;
          },
        },
      },
    };
  }

  static deduplicateRegistrations(
    registrations: ToolRegistration[],
  ): ToolRegistration[] {
    const seen = new Set<string>();
    const deduplicated: ToolRegistration[] = [];

    for (const registration of registrations) {
      const [name] = registration;
      if (seen.has(name)) {
        McpServerToolUtils._logger.warn(
          `Multiple tools with the same name (${name}) found. Keeping the first registration.`,
        );
        continue;
      }

      seen.add(name);
      deduplicated.push(registration);
    }

    return deduplicated;
  }
}
