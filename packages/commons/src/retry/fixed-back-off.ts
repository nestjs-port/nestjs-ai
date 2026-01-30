import { type Milliseconds, ms } from "../temporal";
import { type BackOff, BackOffExecution } from "./back-off.interface";

/**
 * A simple {@link BackOff} implementation that provides a fixed interval
 * between two attempts and a maximum number of retries.
 */
export class FixedBackOff implements BackOff {
	/**
	 * The default recovery interval: 5000 ms = 5 seconds.
	 */
	static readonly DEFAULT_INTERVAL: Milliseconds = ms(5000);

	/**
	 * Constant value indicating an unlimited number of attempts.
	 */
	static readonly UNLIMITED_ATTEMPTS = Number.MAX_SAFE_INTEGER;

	public interval: Milliseconds;
	public maxAttempts: number;

	/**
	 * Create an instance with the supplied interval and maximum number of attempts.
	 *
	 * @param interval - The interval between two attempts in milliseconds.
	 *                   Defaults to {@link DEFAULT_INTERVAL} (5000ms).
	 * @param maxAttempts - The maximum number of attempts.
	 *                      Defaults to {@link UNLIMITED_ATTEMPTS}.
	 * @throws Error if interval is negative
	 * @throws Error if maxAttempts is negative
	 */
	constructor(
		interval: Milliseconds = FixedBackOff.DEFAULT_INTERVAL,
		maxAttempts: number = FixedBackOff.UNLIMITED_ATTEMPTS,
	) {
		if (interval < 0) {
			throw new Error("interval must be >= 0");
		}
		if (maxAttempts < 0) {
			throw new Error("maxAttempts must be >= 0");
		}
		this.interval = interval;
		this.maxAttempts = maxAttempts;
	}

	start(): BackOffExecution {
		return new FixedBackOffExecution(this.interval, this.maxAttempts);
	}

	toString(): string {
		const attemptValue =
			this.maxAttempts === FixedBackOff.UNLIMITED_ATTEMPTS
				? "unlimited"
				: String(this.maxAttempts);
		return `FixedBackOff[interval=${this.interval}, maxAttempts=${attemptValue}]`;
	}
}

/**
 * Internal execution state for {@link FixedBackOff}.
 */
class FixedBackOffExecution implements BackOffExecution {
	private currentAttempts = 0;

	/**
	 * Create a new execution instance.
	 *
	 * @param interval - The interval between two attempts in milliseconds
	 * @param maxAttempts - The maximum number of attempts
	 */
	constructor(
		private readonly interval: Milliseconds,
		private readonly maxAttempts: number,
	) {}

	nextBackOff(): Milliseconds {
		this.currentAttempts++;
		if (this.currentAttempts <= this.maxAttempts) {
			return this.interval;
		}
		return BackOffExecution.STOP;
	}

	toString(): string {
		const attemptValue =
			this.maxAttempts === FixedBackOff.UNLIMITED_ATTEMPTS
				? "unlimited"
				: String(this.maxAttempts);
		return `FixedBackOffExecution[interval=${this.interval}, currentAttempts=${this.currentAttempts}, maxAttempts=${attemptValue}]`;
	}
}
