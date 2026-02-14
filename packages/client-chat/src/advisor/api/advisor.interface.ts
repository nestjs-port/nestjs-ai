import { HIGHEST_PRECEDENCE, type Ordered } from "@nestjs-ai/commons";

/**
 * Parent advisor interface for all advisors.
 */
export interface Advisor extends Ordered {
	/**
	 * Return the name of the advisor.
	 */
	get name(): string;
}

export namespace Advisor {
	export const DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER = HIGHEST_PRECEDENCE + 1000;
}
