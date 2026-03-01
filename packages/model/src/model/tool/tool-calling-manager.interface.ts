import type { ChatResponse, Prompt } from "../../chat";
import type { ToolDefinition } from "../../tool";
import { DefaultToolCallingManager } from "./default-tool-calling-manager";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";
import type { ToolExecutionResult } from "./tool-execution-result";

/**
 * Service responsible for managing the tool calling process for a chat model.
 */
export interface ToolCallingManager {
  /**
   * Resolve the tool definitions from the model's tool calling options.
   */
  resolveToolDefinitions(chatOptions: ToolCallingChatOptions): ToolDefinition[];

  /**
   * Execute the tool calls requested by the model.
   */
  executeToolCalls(
    prompt: Prompt,
    chatResponse: ChatResponse,
  ): Promise<ToolExecutionResult>;
}

export namespace ToolCallingManager {
  /**
   * Create a default {@link ToolCallingManager} builder.
   */
  export function builder() {
    return new DefaultToolCallingManager();
  }
}
