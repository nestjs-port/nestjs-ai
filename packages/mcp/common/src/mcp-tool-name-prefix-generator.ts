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

import type { Tool as McpTool } from "@modelcontextprotocol/sdk/spec.types.js";
import type { McpConnectionInfo } from "./mcp-connection-info";

export abstract class McpToolNamePrefixGenerator {
  abstract prefixedToolName(
    mcpConnectionInfo: McpConnectionInfo,
    tool: McpTool,
  ): string;

  static noPrefix(): McpToolNamePrefixGenerator {
    return new (class extends McpToolNamePrefixGenerator {
      override prefixedToolName(
        _mcpConnectionInfo: McpConnectionInfo,
        tool: McpTool,
      ): string {
        return tool.name;
      }
    })();
  }
}
