import type { RetryException } from "./retry-exception";
import type { RetryPolicy } from "./retry-policy.interface";
import type { RetryState } from "./retry-state";
import type { Retryable } from "./retryable.interface";

/**
 * `RetryListener` defines a *listener* API for reacting to events
 * published during the execution of a {@link Retryable} operation.
 *
 * Typically registered in a {@link RetryTemplate}, and can be composed using a
 * {@link CompositeRetryListener}.
 *
 * @see CompositeRetryListener
 */
export interface RetryListener {
	/**
	 * Called before every retry attempt.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 */
	beforeRetry?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
	): void;

	/**
	 * Called after every failed retry attempt.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param throwable the exception thrown by the {@link Retryable} operation
	 */
	onRetryFailure?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		throwable: unknown,
	): void;

	/**
	 * Called after the first successful retry attempt.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param result the result of the {@link Retryable} operation
	 */
	onRetrySuccess?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		result: unknown,
	): void;

	/**
	 * Called after every attempt, including the initial invocation.
	 *
	 * The success of the attempt can be checked via {@link RetryState.isSuccessful};
	 * if not successful, the current exception can be introspected via
	 * {@link RetryState.lastException}.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param retryState the current state of retry processing
	 * (this is a live instance reflecting the current state; not intended to be stored)
	 * @see RetryTemplate.execute
	 * @see RetryState.isSuccessful
	 * @see RetryState.lastException
	 * @see RetryState.retryCount
	 */
	onRetryableExecution?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		retryState: RetryState,
	): void;

	/**
	 * Called if the {@link RetryPolicy} is exhausted.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param exception the resulting {@link RetryException}, with the last
	 * exception thrown by the {@link Retryable} operation as the cause and any
	 * exceptions from previous attempts as suppressed exceptions
	 * @see RetryException.exceptions
	 * @see RetryException.retryCount
	 */
	onRetryPolicyExhaustion?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		exception: RetryException,
	): void;

	/**
	 * Called if the configured {@link RetryPolicy.timeout timeout} for
	 * a {@link RetryPolicy} is exceeded.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param exception the resulting {@link RetryException}, with the last
	 * exception thrown by the {@link Retryable} operation as the cause and any
	 * exceptions from previous attempts as suppressed exceptions
	 * @see RetryException.exceptions
	 * @see RetryException.retryCount
	 */
	onRetryPolicyTimeout?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		exception: RetryException,
	): void;

	/**
	 * Called if the {@link RetryPolicy} is interrupted between retry attempts.
	 *
	 * @param retryPolicy the {@link RetryPolicy}
	 * @param retryable the {@link Retryable} operation
	 * @param retryableName the name of the retryable operation
	 * @param exception the resulting {@link RetryException}, with the last
	 * exception thrown by the {@link Retryable} operation as the cause and any
	 * exceptions from previous attempts as suppressed exceptions
	 * @see RetryException.exceptions
	 * @see RetryException.retryCount
	 */
	onRetryPolicyInterruption?(
		retryPolicy: RetryPolicy,
		retryable: Retryable,
		retryableName: string,
		exception: RetryException,
	): void;
}
