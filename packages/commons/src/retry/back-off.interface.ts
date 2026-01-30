import type { Milliseconds } from "../temporal";

/**
 * Strategy interface for providing a {@link BackOffExecution} that indicates the
 * rate at which an operation should be retried.
 *
 * Users of this interface are expected to use it like this:
 *
 * ```ts
 * BackOffExecution execution = backOff.start();
 *
 * // In the operation recovery/retry loop:
 * const waitInterval = execution.nextBackOff();
 * if (waitInterval == BackOffExecution.STOP) {
 *     // do not retry operation
 * }
 * else {
 *     // sleep, for example, Thread.sleep(waitInterval)
 *     // retry operation
 * }
 * ```
 *
 * Once the underlying operation has completed successfully, the execution
 * instance can be discarded.
 *
 * @see BackOffExecution
 * @see FixedBackOff
 * @see ExponentialBackOff
 */
export interface BackOff {
	/**
	 * Start a new back off execution.
	 * @return a fresh {@link BackOffExecution} ready to be used
	 */
	start(): BackOffExecution;
}

/**
 * <p>A {@link BackOffExecution} is effectively an executable instance of a given
 * {@link BackOff} strategy.
 *
 * @see BackOff
 */
export abstract class BackOffExecution {
	/**
	 * Return value of {@link #nextBackOff()} which indicates that the operation
	 * should not be retried.
	 */
	static STOP = -1 as Milliseconds;

	/**
	 * Return the number of milliseconds to wait before retrying the operation
	 * or {@link #STOP} ({@value #STOP}) to indicate that no further attempt
	 * should be made for the operation.
	 */
	abstract nextBackOff(): Milliseconds;
}
