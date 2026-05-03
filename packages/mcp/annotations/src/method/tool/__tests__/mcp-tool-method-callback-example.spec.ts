/*
 * Copyright 2026-present the original author or authors.
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

import type { CallToolResult } from "@modelcontextprotocol/server";

import { McpTool } from "../../../mcp-tool.js";
import type { McpToolMethodArguments } from "../mcp-tool-method-arguments.js";

/**
 * Example class with methods annotated with `McpTool` for testing the tool method
 * callback.
 */
export class McpToolMethodCallbackExample {
  @McpTool({ name: "simple-tool", description: "A simple tool" })
  simpleTool(args: McpToolMethodArguments): string {
    const input = String(args.arguments.input ?? "");
    return `Processed: ${input}`;
  }

  @McpTool({ name: "structured-tool", description: "A structured tool" })
  structuredTool(args: McpToolMethodArguments): Record<string, unknown> {
    return {
      input: args.arguments.input,
      processed: true,
    };
  }

  @McpTool({ name: "async-tool", description: "An async tool" })
  async asyncTool(args: McpToolMethodArguments): Promise<string> {
    const input = String(args.arguments.input ?? "");
    return Promise.resolve(`Async processed: ${input}`);
  }

  @McpTool({
    name: "result-tool",
    description: "A tool returning CallToolResult",
  })
  resultTool(args: McpToolMethodArguments): CallToolResult {
    const input = String(args.arguments.input ?? "");
    return {
      content: [{ type: "text", text: `Result: ${input}` }],
    };
  }

  // Invalid signatures for compile-time validation only

  // @ts-expect-error @McpTool only supports methods with a single object parameter
  @McpTool({ name: "no-arguments", description: "Invalid no argument tool" })
  noParameters(): string {
    return "no parameters";
  }

  // @ts-expect-error @McpTool only supports methods with a single object parameter
  @McpTool({
    name: "wrong-argument-type",
    description: "Invalid argument type tool",
  })
  wrongArgumentType(_args: string): string {
    void _args;

    return "wrong argument type";
  }

  // @ts-expect-error @McpTool only supports methods with a single object parameter
  @McpTool({
    name: "too-many-arguments",
    description: "Invalid too many arguments tool",
  })
  tooManyParameters(_args: McpToolMethodArguments, _extra: string): string {
    void _args;
    void _extra;

    return "too many parameters";
  }
}

void McpToolMethodCallbackExample;
