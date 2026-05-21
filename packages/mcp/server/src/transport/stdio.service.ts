import {
  type McpServer,
  StdioServerTransport,
} from "@modelcontextprotocol/server";
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { MCP_SERVER_TOKEN } from "../module/mcp-server.tokens.js";

@Injectable()
export class McpServerStdioService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private transport: StdioServerTransport | null = null;

  constructor(
    @Inject(MCP_SERVER_TOKEN)
    private readonly mcpServer: McpServer,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.mcpServer.connect(this.transport);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.transport != null) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
