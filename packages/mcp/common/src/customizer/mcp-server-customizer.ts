import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpServerCustomizer {
  customize(serverBuilder: McpServer): void;
}
