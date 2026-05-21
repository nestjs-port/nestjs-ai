import type { ToolDefinition } from "../definition/tool-definition.js";

/**
 * An exception thrown when a tool execution fails.
 */
export class ToolExecutionException extends Error {
  readonly toolDefinition: ToolDefinition;

  constructor(toolDefinition: ToolDefinition, cause: Error) {
    super(cause.message, { cause });
    this.toolDefinition = toolDefinition;
    this.name = "ToolExecutionException";
  }
}
