import { DefaultUsage } from "./default-usage";
import type { Usage } from "./usage";

/**
 * Utility for calculating cumulative usage across multiple API calls.
 * Used to track total token usage across tool calling rounds.
 */
export class UsageCalculator {
	/**
	 * Calculate cumulative usage by adding current usage to previous response's usage.
	 * @param currentUsage Current API call's usage
	 * @param previousChatResponse Previous chat response with cumulative usage
	 * @returns New cumulative usage
	 */
	static getCumulativeUsage(
		currentUsage: Usage | null | undefined,
		previousChatResponse: any | null | undefined,
	): Usage {
		if (!previousChatResponse || !previousChatResponse.metadata) {
			return currentUsage ?? new DefaultUsage();
		}

		const previousUsage = previousChatResponse.metadata.usage;
		if (!previousUsage) {
			return currentUsage ?? new DefaultUsage();
		}

		return new DefaultUsage({
			promptTokens:
				(currentUsage?.promptTokens ?? 0) + (previousUsage.promptTokens ?? 0),
			completionTokens:
				(currentUsage?.completionTokens ?? 0) +
				(previousUsage.completionTokens ?? 0),
			totalTokens:
				(currentUsage?.totalTokens ?? 0) + (previousUsage.totalTokens ?? 0),
		});
	}
}
