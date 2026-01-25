import type { RateLimit } from "@nestjs-ai/model";

/**
 * RateLimit implementation for OpenAI.
 *
 * @see {@link https://platform.openai.com/docs/guides/rate-limits/rate-limits-in-headers Rate limits in headers}
 */
export class OpenAiRateLimit implements RateLimit {
	constructor(
		readonly requestsLimit: number,
		readonly requestsRemaining: number,
		readonly requestsReset: number,
		readonly tokensLimit: number,
		readonly tokensRemaining: number,
		readonly tokensReset: number,
	) {}

	[Symbol.toPrimitive](): string {
		return `{ @type: ${this.constructor.name}, requestsLimit: ${this.requestsLimit}, requestsRemaining: ${this.requestsRemaining}, requestsReset: ${this.requestsReset}, tokensLimit: ${this.tokensLimit}, tokensRemaining: ${this.tokensRemaining}, tokensReset: ${this.tokensReset} }`;
	}
}
