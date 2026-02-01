import type { ChatResponse } from "../../chat/model/chat-response";
import type { Prompt } from "../../chat/prompt/prompt";
import type { ToolDefinition } from "../definition";
import type { ToolExecutionResult } from "./tool-execution-result";

/**
 * Service responsible for managing the tool calling process for a chat model.
 */
export interface ToolCallingManager {
	/**
	 * Resolve the tool definitions from the model's tool calling options.
	 * @param options - Configuration containing tool callbacks
	 * @returns Array of resolved ToolDefinitions
	 */
	resolveToolDefinitions(options: unknown): ToolDefinition[];

	/**
	 * Execute the tool calls requested by the model.
	 * @param prompt - Original prompt
	 * @param chatResponse - Response with tool calls
	 * @returns Execution result with updated history
	 */
	executeToolCalls(
		prompt: Prompt,
		chatResponse: ChatResponse,
	): Promise<ToolExecutionResult>;
}
