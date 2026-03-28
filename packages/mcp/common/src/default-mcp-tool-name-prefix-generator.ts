import type {
  Implementation,
  InitializeResult,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/spec.types.js";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { McpConnectionInfo } from "./mcp-connection-info";
import { McpToolNamePrefixGenerator } from "./mcp-tool-name-prefix-generator";
import { McpToolUtils } from "./mcp-tool-utils";

export class DefaultMcpToolNamePrefixGenerator extends McpToolNamePrefixGenerator {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    DefaultMcpToolNamePrefixGenerator.name,
  );

  // Idempotency tracking. For a given combination of (client, server, tool) we will
  // generate a unique tool name only once.
  private readonly _existingConnections = new Set<string>();

  private readonly _allUsedToolNames = new Set<string>();

  private _counter = 1;

  override prefixedToolName(
    mcpConnectionInfo: McpConnectionInfo,
    tool: McpTool,
  ): string {
    let uniqueToolName = McpToolUtils.format(tool.name);

    const connectionKey = DefaultMcpToolNamePrefixGenerator.connectionKey(
      mcpConnectionInfo.clientInfo,
      mcpConnectionInfo.initializeResult?.serverInfo ?? null,
      tool,
    );

    if (!this._existingConnections.has(connectionKey)) {
      this._existingConnections.add(connectionKey);

      if (this._allUsedToolNames.has(uniqueToolName)) {
        uniqueToolName = `alt_${this._counter++}_${uniqueToolName}`;
        this._allUsedToolNames.add(uniqueToolName);
        DefaultMcpToolNamePrefixGenerator.logger.warn(
          "Tool name '{}' already exists. Using unique tool name '{}'",
          tool.name,
          uniqueToolName,
        );
      } else {
        this._allUsedToolNames.add(uniqueToolName);
      }
    }

    return uniqueToolName;
  }

  private static connectionKey(
    clientInfo: Implementation,
    serverInfo: InitializeResult["serverInfo"] | null,
    tool: McpTool,
  ): string {
    return DefaultMcpToolNamePrefixGenerator.stableStringify({
      clientInfo,
      serverInfo,
      tool,
    });
  }

  private static stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, currentValue) => {
      if (
        currentValue != null &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue)
      ) {
        return Object.keys(currentValue as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = (currentValue as Record<string, unknown>)[key];
            return result;
          }, {});
      }

      return currentValue;
    }) as string;
  }
}
