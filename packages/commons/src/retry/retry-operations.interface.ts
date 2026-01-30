import type { Retryable } from "./retryable.interface";

/**
 * Interface specifying basic retry operations.
 *
 * Implemented by {@link RetryTemplate}. Not often used directly, but a useful
 * option to enhance testability, as it can easily be mocked or stubbed.
 */
export interface RetryOperations {
	/**
	 * Execute the given {@link Retryable} operation according to the {@link RetryPolicy}
	 * configured at the implementation level.
	 *
	 * If the {@code Retryable} succeeds, its result will be returned. Otherwise, a
	 * {@link RetryException} will be thrown to the caller. The {@code RetryException}
	 * will contain the last exception thrown by the {@code Retryable} operation as the
	 * {@linkplain RetryException#getCause() cause} and any exceptions from previous
	 * attempts as {@linkplain RetryException#getSuppressed() suppressed exceptions}.
	 *
	 * @param retryable the {@code Retryable} to execute and retry if needed
	 * @param name optional name for logging purposes (defaults to function name or 'anonymous')
	 * @return the result of the {@code Retryable}, if any
	 * @throws RetryException if the {@code RetryPolicy} is exhausted
	 */
	execute<R>(retryable: Retryable<R>, name?: string): Promise<R>;
}
