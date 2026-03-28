import type { Tool as McpTool } from "@modelcontextprotocol/sdk/spec.types.js";
import type { McpConnectionInfo } from "./mcp-connection-info";

export interface McpToolFilter {
  test(connectionInfo: McpConnectionInfo, tool: McpTool): boolean;
}
