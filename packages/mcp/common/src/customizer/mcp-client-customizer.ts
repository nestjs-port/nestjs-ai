import type { Client as McpClient } from "@modelcontextprotocol/client";

export abstract class McpClientCustomizer {
  abstract customize(name: string, client: McpClient): void;
}
