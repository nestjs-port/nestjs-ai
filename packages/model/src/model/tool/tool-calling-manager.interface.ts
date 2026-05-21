import type { ChatResponse } from "../../chat/model/chat-response.js";
import type { Prompt } from "../../chat/prompt/prompt.js";
import type { ToolDefinition } from "../../tool/definition/tool-definition.js";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface.js";
import type { ToolExecutionResult } from "./tool-execution-result.js";

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
