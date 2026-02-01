import assert from "node:assert/strict";

import { LoggerFactory } from "../logging";
import { BackOffExecution } from "./back-off.interface";
import { RetryException } from "./retry-exception";
import type { RetryListener } from "./retry-listener.interface";
import { RetryPolicy } from "./retry-policy.interface";
import { RetryState } from "./retry-state";
import type { Retryable } from "./retryable.interface";

/**
 * Private mutable state holder during retry execution.
 */
class MutableRetryState extends RetryState {
	private _retryCount = 0;
	private readonly _exceptions: unknown[] = [];

	increaseRetryCount(): void {
		this._retryCount++;
	}

	addException(exception: unknown): void {
		this._exceptions.push(exception);
	}

	get retryCount(): number {
		return this._retryCount;
	}

	get exceptions(): readonly unknown[] {
		return this._exceptions;
	}

	toString(): string {
		return `RetryState: retryCount=${this._retryCount}, exceptions=${JSON.stringify(this._exceptions)}`;
	}
}

/**
 * A basic implementation of {@link RetryOperations} that executes and potentially
 * retries a {@link Retryable} operation based on a configured {@link RetryPolicy}.
 *
 * By default, a retryable operation will be executed once and potentially
 * retried at most 3 times with a fixed backoff of 1 second.
 *
 * A {@link RetryListener} can be {@link setRetryListener registered} to react
 * to events published during key retry phases (before a retry attempt,
 * after a retry attempt, etc.).
 *
 * All retry actions performed by this template are logged at debug level, using
 * {@code "RetryTemplate"} as the log category.
 *
 * @see RetryOperations
 * @see RetryPolicy
 * @see BackOff
 * @see RetryListener
 * @see Retryable
 */
export class RetryTemplate {
	private _retryPolicy: RetryPolicy = RetryPolicy.withDefaults();
	private _retryListener: RetryListener = {};
	private logger = LoggerFactory.getLogger(RetryTemplate.name);

	/**
	 * Create a new {@code RetryTemplate} with maximum 3 retry attempts and a
	 * fixed backoff of 1 second.
	 * @see RetryPolicy.withDefaults
	 */
	constructor();

	/**
	 * Create a new {@code RetryTemplate} with the supplied {@link RetryPolicy}.
	 * @param retryPolicy the retry policy to use
	 */
	constructor(retryPolicy: RetryPolicy);

	constructor(retryPolicy?: RetryPolicy) {
		if (retryPolicy != null) {
			this._retryPolicy = retryPolicy;
		}
	}

	/**
	 * Set the {@link RetryPolicy} to use.
	 *
	 * Defaults to {@code RetryPolicy.withDefaults()}.
	 * @param retryPolicy the retry policy to use
	 * @see RetryPolicy.withDefaults
	 * @see RetryPolicy.withMaxRetries
	 * @see RetryPolicy.builder
	 */
	set retryPolicy(retryPolicy: RetryPolicy) {
		assert(retryPolicy != null, "Retry policy must not be null");
		this._retryPolicy = retryPolicy;
	}

	/**
	 * Return the current {@link RetryPolicy} that is in use with this template.
	 */
	get retryPolicy(): RetryPolicy {
		return this._retryPolicy;
	}

	/**
	 * Set the {@link RetryListener} to use.
	 *
	 * If multiple listeners are needed, use a {@link CompositeRetryListener}.
	 *
	 * Defaults to a no-op implementation.
	 * @param retryListener the retry listener to use
	 */
	set retryListener(retryListener: RetryListener) {
		assert(retryListener != null, "Retry listener must not be null");
		this._retryListener = retryListener;
	}

	/**
	 * Return the current {@link RetryListener} that is in use with this template.
	 */
	get retryListener(): RetryListener {
		return this._retryListener;
	}

	/**
	 * Execute the supplied {@link Retryable} operation according to the configured
	 * {@link RetryPolicy}.
	 *
	 * If the {@code Retryable} succeeds, its result will be returned. Otherwise, a
	 * {@link RetryException} will be thrown to the caller. The {@code RetryException}
	 * will contain the last exception thrown by the {@code Retryable} operation as the
	 * {@link RetryException#cause cause} and any exceptions from previous
	 * attempts as suppressed exceptions.
	 * @param retryable the {@code Retryable} to execute and retry if needed
	 * @param name optional name for logging purposes (defaults to function name or 'anonymous')
	 * @returns the result of the {@code Retryable}, if any
	 * @throws RetryException if the {@code RetryPolicy} is exhausted
	 */
	async execute<R>(retryable: Retryable<R>, name?: string): Promise<R> {
		const startTime = Date.now();
		const retryableName = (name ?? retryable.name) || "anonymous";
		const retryState = new MutableRetryState();

		// Initial attempt
		this.logger.debug(
			`Preparing to execute retryable operation '${retryableName}'`,
		);
		let result: R;
		try {
			result = await retryable();
		} catch (initialException) {
			if (initialException instanceof Error) {
				this.logger.debug(
					`Execution of retryable operation '${retryableName}' failed; initiating the retry process`,
					initialException,
				);
			} else {
				this.logger.debug(
					`Execution of retryable operation '${retryableName}' failed; initiating the retry process`,
				);
			}
			retryState.addException(initialException);
			this._retryListener.onRetryableExecution?.(
				this._retryPolicy,
				retryable,
				retryableName,
				retryState,
			);

			// Retry process starts here
			const backOffExecution = this._retryPolicy.backOff.start();
			let lastException = initialException;
			const timeout = this._retryPolicy.timeout;

			while (this._retryPolicy.shouldRetry(lastException as Error)) {
				this.checkIfTimeoutExceeded(
					timeout,
					startTime,
					0,
					retryable,
					retryableName,
					retryState,
				);

				const sleepTime = backOffExecution.nextBackOff();
				if (sleepTime === BackOffExecution.STOP) {
					break;
				}
				this.checkIfTimeoutExceeded(
					timeout,
					startTime,
					sleepTime,
					retryable,
					retryableName,
					retryState,
				);
				this.logger.debug(
					`Backing off for ${sleepTime}ms after retryable operation '${retryableName}'`,
				);
				await new Promise((resolve) => setTimeout(resolve, sleepTime));

				this.logger.debug(`Preparing to retry operation '${retryableName}'`);
				retryState.increaseRetryCount();
				this._retryListener.beforeRetry?.(
					this._retryPolicy,
					retryable,
					retryableName,
				);
				try {
					result = await retryable();
				} catch (currentException) {
					if (currentException instanceof Error) {
						this.logger.debug(
							`Retry attempt for operation '${retryableName}' failed`,
							currentException,
						);
					} else {
						this.logger.debug(
							`Retry attempt for operation '${retryableName}' failed due to '${currentException}'`,
						);
					}
					retryState.addException(currentException);
					this._retryListener.onRetryFailure?.(
						this._retryPolicy,
						retryable,
						retryableName,
						currentException,
					);
					this._retryListener.onRetryableExecution?.(
						this._retryPolicy,
						retryable,
						retryableName,
						retryState,
					);
					lastException = currentException;
					continue;
				}

				// Did not enter catch block above -> retry success.
				this.logger.debug(
					`Retryable operation '${retryableName}' completed successfully after retry`,
				);
				this._retryListener.onRetrySuccess?.(
					this._retryPolicy,
					retryable,
					retryableName,
					result,
				);
				this._retryListener.onRetryableExecution?.(
					this._retryPolicy,
					retryable,
					retryableName,
					retryState,
				);
				return result;
			}

			// The RetryPolicy has exhausted at this point, so we throw a RetryException with the
			// last exception as the cause and remaining exceptions as suppressed exceptions.
			const retryException = new RetryException(
				`Retry policy for operation '${retryableName}' exhausted; aborting execution`,
				retryState,
			);
			this._retryListener.onRetryPolicyExhaustion?.(
				this._retryPolicy,
				retryable,
				retryableName,
				retryException,
			);
			throw retryException;
		}

		// Never entered initial catch block -> initial success.
		this.logger.debug(
			`Retryable operation '${retryableName}' completed successfully`,
		);
		this._retryListener.onRetryableExecution?.(
			this._retryPolicy,
			retryable,
			retryableName,
			retryState,
		);
		return result;
	}

	private checkIfTimeoutExceeded(
		timeout: number,
		startTime: number,
		sleepTime: number,
		retryable: Retryable,
		retryableName: string,
		retryState: RetryState,
	): void {
		if (timeout > 0) {
			// If sleepTime > 0, we are predicting what the effective elapsed time
			// would be if we were to sleep for sleepTime milliseconds.
			const elapsedTime = Date.now() + sleepTime - startTime;
			if (elapsedTime >= timeout) {
				const message =
					sleepTime > 0
						? `Retry policy for operation '${retryableName}' would exceed timeout (${timeout}ms) due to pending sleep time (${sleepTime}ms); preemptively aborting execution`
						: `Retry policy for operation '${retryableName}' exceeded timeout (${timeout}ms); aborting execution`;
				const retryException = new RetryException(message, retryState);
				this._retryListener.onRetryPolicyTimeout?.(
					this._retryPolicy,
					retryable,
					retryableName,
					retryException,
				);
				throw retryException;
			}
		}
	}
}
