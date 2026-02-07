import type { ChatOptions, ChatResponse } from "../../chat";

/**
 * Interface for determining when tool execution should be performed based on model
 * responses.
 */
export interface ToolExecutionEligibilityPredicate {
	/**
	 * Determines if tool execution should be performed based on the prompt options and
	 * chat response.
	 * @param promptOptions The options from the prompt
	 * @param chatResponse The response from the chat model
	 * @returns true if tool execution should be performed, false otherwise
	 */
	isToolExecutionRequired(
		promptOptions: ChatOptions,
		chatResponse: ChatResponse,
	): boolean;
}
