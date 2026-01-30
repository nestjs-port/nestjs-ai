import { type Milliseconds, ms } from "../temporal";
import { type BackOff, BackOffExecution } from "./back-off.interface";

/**
 * Implementation of {@link BackOff} that increases the back-off period for each attempt.
 * When the interval has reached the {@link maxInterval}, it is no longer increased.
 * Stops once the {@link maxElapsedTime} or {@link maxAttempts} has been reached.
 *
 * Example: The default interval is {@link DEFAULT_INITIAL_INTERVAL} ms;
 * the default multiplier is {@link DEFAULT_MULTIPLIER}; and the default max
 * interval is {@link DEFAULT_MAX_INTERVAL}. For 10 attempts the sequence will be
 * as follows:
 *
 * ```
 * request#     back-off
 *
 *  1              2000
 *  2              3000
 *  3              4500
 *  4              6750
 *  5             10125
 *  6             15187
 *  7             22780
 *  8             30000
 *  9             30000
 * 10             30000
 * ```
 *
 * Note that the default max elapsed time is {@link Number.MAX_SAFE_INTEGER}, and the
 * default maximum number of attempts is {@link Number.MAX_SAFE_INTEGER}.
 * Use {@link maxElapsedTime} to limit the length of time that an instance
 * should accumulate before returning {@link BackOffExecution.STOP}. Alternatively,
 * use {@link maxAttempts} to limit the number of attempts. The execution
 * stops when either of those two limits is reached.
 *
 * @see BackOff
 * @see BackOffExecution
 */
export class ExponentialBackOff implements BackOff {
	/**
	 * The default initial interval: 2000 ms.
	 */
	static readonly DEFAULT_INITIAL_INTERVAL: Milliseconds = ms(2000);

	/**
	 * The default jitter value for each interval: 0 ms.
	 */
	static readonly DEFAULT_JITTER: Milliseconds = ms(0);

	/**
	 * The default multiplier (increases the interval by 50%): 1.5.
	 */
	static readonly DEFAULT_MULTIPLIER = 1.5;

	/**
	 * The default maximum back-off time: 30000 ms.
	 */
	static readonly DEFAULT_MAX_INTERVAL: Milliseconds = ms(30_000);

	/**
	 * The default maximum elapsed time: unlimited.
	 */
	static readonly DEFAULT_MAX_ELAPSED_TIME: Milliseconds = ms(
		Number.MAX_SAFE_INTEGER,
	);

	/**
	 * The default maximum attempts: unlimited.
	 */
	static readonly DEFAULT_MAX_ATTEMPTS = Number.MAX_SAFE_INTEGER;

	/**
	 * The initial interval in milliseconds.
	 */
	public initialInterval: Milliseconds =
		ExponentialBackOff.DEFAULT_INITIAL_INTERVAL;

	/**
	 * The jitter value to apply for each interval in milliseconds.
	 */
	public jitter: Milliseconds = ExponentialBackOff.DEFAULT_JITTER;

	/**
	 * The value to multiply the current interval by for each attempt.
	 */
	public multiplier: number = ExponentialBackOff.DEFAULT_MULTIPLIER;

	/**
	 * The maximum back-off time in milliseconds.
	 */
	public maxInterval: Milliseconds = ExponentialBackOff.DEFAULT_MAX_INTERVAL;

	/**
	 * The maximum elapsed time in milliseconds after which a call to
	 * {@link BackOffExecution.nextBackOff} returns {@link BackOffExecution.STOP}.
	 */
	public maxElapsedTime: Milliseconds =
		ExponentialBackOff.DEFAULT_MAX_ELAPSED_TIME;

	/**
	 * The maximum number of attempts after which a call to
	 * {@link BackOffExecution.nextBackOff} returns {@link BackOffExecution.STOP}.
	 */
	public maxAttempts: number = ExponentialBackOff.DEFAULT_MAX_ATTEMPTS;

	/**
	 * Create an instance with the default settings.
	 *
	 * @see DEFAULT_INITIAL_INTERVAL
	 * @see DEFAULT_JITTER
	 * @see DEFAULT_MULTIPLIER
	 * @see DEFAULT_MAX_INTERVAL
	 * @see DEFAULT_MAX_ELAPSED_TIME
	 * @see DEFAULT_MAX_ATTEMPTS
	 */
	constructor();

	/**
	 * Create an instance with the supplied settings.
	 *
	 * @param initialInterval - The initial interval in milliseconds
	 * @param multiplier - The multiplier (must be greater than or equal to 1)
	 * @throws Error if multiplier is less than 1
	 */
	constructor(initialInterval: Milliseconds, multiplier: number);

	constructor(initialInterval?: Milliseconds, multiplier?: number) {
		if (initialInterval !== undefined && multiplier !== undefined) {
			this.checkMultiplier(multiplier);
			this.initialInterval = initialInterval;
			this.multiplier = multiplier;
		}
	}

	private checkMultiplier(multiplier: number): void {
		if (multiplier < 1) {
			throw new Error(
				`Invalid multiplier '${multiplier}': Should be greater than or equal to 1. ` +
					`A multiplier of 1 is equivalent to a fixed interval.`,
			);
		}
	}

	/**
	 * Set the jitter value to apply for each interval, leading to random
	 * milliseconds to be subtracted or added and resulting in a value between
	 * `interval - jitter` and `interval + jitter` but never below
	 * `initialInterval` or above `maxInterval`.
	 *
	 * If a `multiplier` is specified, it is applied to the jitter value as well.
	 *
	 * @param jitter - The jitter value in milliseconds
	 * @throws Error if jitter is negative
	 */
	setJitter(jitter: Milliseconds): void {
		if (jitter < 0) {
			throw new Error(`Invalid jitter '${jitter}': must be >= 0.`);
		}
		this.jitter = jitter;
	}

	/**
	 * Set the value to multiply the current interval by for each attempt.
	 *
	 * This applies to the {@link initialInterval} as well as the {@link jitter} range.
	 *
	 * @param multiplier - The multiplier (must be greater than or equal to 1)
	 * @throws Error if multiplier is less than 1
	 */
	setMultiplier(multiplier: number): void {
		this.checkMultiplier(multiplier);
		this.multiplier = multiplier;
	}

	/**
	 * Start a new back off execution.
	 *
	 * @returns A fresh {@link BackOffExecution} ready to be used
	 */
	start(): BackOffExecution {
		return new ExponentialBackOffExecution(this);
	}

	toString(): string {
		return (
			`ExponentialBackOff[` +
			`initialInterval=${this.initialInterval}, ` +
			`jitter=${this.jitter}, ` +
			`multiplier=${this.multiplier}, ` +
			`maxInterval=${this.maxInterval}, ` +
			`maxElapsedTime=${this.maxElapsedTime}, ` +
			`maxAttempts=${this.maxAttempts}]`
		);
	}
}

/**
 * Internal execution state for {@link ExponentialBackOff}.
 */
class ExponentialBackOffExecution extends BackOffExecution {
	private currentInterval: Milliseconds = ms(-1);
	private currentElapsedTime: Milliseconds = ms(0);
	private attempts = 0;

	constructor(private readonly backOff: ExponentialBackOff) {
		super();
	}

	nextBackOff(): Milliseconds {
		if (
			this.currentElapsedTime >= this.backOff.maxElapsedTime ||
			this.attempts >= this.backOff.maxAttempts
		) {
			return BackOffExecution.STOP;
		}
		const nextInterval = this.computeNextInterval();
		this.currentElapsedTime = ms(this.currentElapsedTime + nextInterval);
		this.attempts++;
		return nextInterval;
	}

	private computeNextInterval(): Milliseconds {
		const maxInterval = this.backOff.maxInterval;
		let nextInterval: Milliseconds;

		if (this.currentInterval < 0) {
			nextInterval = this.backOff.initialInterval;
		} else if (this.currentInterval >= maxInterval) {
			nextInterval = maxInterval;
		} else {
			nextInterval = ms(
				Math.min(
					Math.floor(this.currentInterval * this.backOff.multiplier),
					maxInterval,
				),
			);
		}

		this.currentInterval = nextInterval;
		return ms(Math.min(this.applyJitter(nextInterval), maxInterval));
	}

	private applyJitter(interval: Milliseconds): Milliseconds {
		const jitter = this.backOff.jitter;
		if (jitter > 0) {
			const initialInterval = this.backOff.initialInterval;
			const applicableJitter = jitter * (interval / initialInterval);
			const min = Math.max(interval - applicableJitter, initialInterval);
			const max = Math.min(
				interval + applicableJitter,
				this.backOff.maxInterval,
			);
			return ms(Math.floor(min + Math.random() * (max - min)));
		}
		return interval;
	}

	toString(): string {
		const currentIntervalDescription =
			this.currentInterval < 0 ? "n/a" : `${this.currentInterval}ms`;
		return (
			`ExponentialBackOffExecution[` +
			`currentInterval=${currentIntervalDescription}, ` +
			`multiplier=${this.backOff.multiplier}, ` +
			`attempts=${this.attempts}]`
		);
	}
}
