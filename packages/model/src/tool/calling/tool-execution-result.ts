import type { Message } from "../../chat/messages";

/**
 * The result of a tool execution.
 */
export interface ToolExecutionResult {
	/**
	 * The history of messages exchanged during the conversation, including the tool
	 * execution result.
	 */
	readonly conversationHistory: Message[];

	/**
	 * Whether the tool execution result should be returned directly or passed back to the
	 * model.
	 */
	readonly returnDirect: boolean;
}
