import type { RateLimit } from "@nestjs-ai/model";

/**
 * RateLimit implementation for OpenAI.
 *
 * @see {@link https://platform.openai.com/docs/guides/rate-limits/rate-limits-in-headers Rate limits in headers}
 */
export class OpenAiRateLimit implements RateLimit {
	readonly requestsLimit: number;
	readonly requestsRemaining: number;
	readonly tokensLimit: number;
	readonly tokensRemaining: number;
	readonly requestsReset: number;
	readonly tokensReset: number;

	constructor(
		requestsLimit: number,
		requestsRemaining: number,
		requestsReset: number,
		tokensLimit: number,
		tokensRemaining: number,
		tokensReset: number,
	) {
		this.requestsLimit = requestsLimit;
		this.requestsRemaining = requestsRemaining;
		this.requestsReset = requestsReset;
		this.tokensLimit = tokensLimit;
		this.tokensRemaining = tokensRemaining;
		this.tokensReset = tokensReset;
	}

	[Symbol.toPrimitive](): string {
		return `{ @type: ${this.constructor.name}, requestsLimit: ${this.requestsLimit}, requestsRemaining: ${this.requestsRemaining}, requestsReset: ${this.requestsReset}, tokensLimit: ${this.tokensLimit}; tokensRemaining: ${this.tokensRemaining}; tokensReset: ${this.tokensReset} }`;
	}
}
