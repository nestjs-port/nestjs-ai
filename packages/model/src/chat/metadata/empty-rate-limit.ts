import type { RateLimit } from "./rate-limit";

/**
 * A RateLimit implementation that returns zero for all property getters.
 */
export class EmptyRateLimit implements RateLimit {
	get requestsLimit(): number {
		return 0;
	}

	get requestsRemaining(): number {
		return 0;
	}

	get requestsReset(): number {
		return 0;
	}

	get tokensLimit(): number {
		return 0;
	}

	get tokensRemaining(): number {
		return 0;
	}

	get tokensReset(): number {
		return 0;
	}
}
