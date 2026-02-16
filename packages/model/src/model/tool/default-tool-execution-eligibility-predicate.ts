import type { ChatOptions, ChatResponse } from "../../chat";
import { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";
import { ToolExecutionEligibilityPredicate } from "./tool-execution-eligibility-predicate";

/**
 * Default implementation of {@link ToolExecutionEligibilityPredicate} that checks whether
 * tool execution is enabled in the prompt options and if the chat response contains tool
 * calls.
 */
export class DefaultToolExecutionEligibilityPredicate extends ToolExecutionEligibilityPredicate {
	test(promptOptions: ChatOptions, chatResponse: ChatResponse): boolean {
		return (
			ToolCallingChatOptions.isInternalToolExecutionEnabled(promptOptions) &&
			chatResponse != null &&
			chatResponse.hasToolCalls()
		);
	}

	override isToolExecutionRequired(
		promptOptions: ChatOptions,
		chatResponse: ChatResponse,
	): boolean {
		return this.test(promptOptions, chatResponse);
	}
}
