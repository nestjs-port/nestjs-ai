import type { Tool as McpTool } from "@modelcontextprotocol/client";
import type { McpConnectionInfo } from "./mcp-connection-info.js";

export abstract class McpToolFilter {
  abstract test(connectionInfo: McpConnectionInfo, tool: McpTool): boolean;
}

export class DefaultMcpToolFilter extends McpToolFilter {
  override test(_connectionInfo: McpConnectionInfo, _tool: McpTool): boolean {
    return true;
  }
}
