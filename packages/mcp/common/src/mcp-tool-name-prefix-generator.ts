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
