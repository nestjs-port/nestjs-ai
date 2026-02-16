import type { DefaultToolDefinitionBuilder } from "./default-tool-definition";
import { DefaultToolDefinition } from "./default-tool-definition";

/**
 * Definition used by the AI model to determine when and how to call the tool.
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export interface ToolDefinition {
  /**
   * The tool name. Unique within the tool set provided to a model.
   */
  readonly name: string;

  /**
   * The tool description, used by the AI model to determine what the tool does.
   */
  readonly description: string;

  /**
   * The schema of the parameters used to call the tool.
   */
  readonly inputSchema: string;
}

/**
 * Static methods for ToolDefinition.
 */
export namespace ToolDefinition {
  /**
   * Create a default {@link ToolDefinition} builder.
   */
  export function builder(): DefaultToolDefinitionBuilder {
    return DefaultToolDefinition.builder();
  }
}
