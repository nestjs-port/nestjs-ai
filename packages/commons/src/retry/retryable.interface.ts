/**
 * {@code Retryable} is a function type that can be used to implement any
 * generic block of code that can potentially be retried.
 *
 * Used in conjunction with {@link RetryOperations}.
 *
 * @param <R> the type of the result
 * @see RetryOperations
 */
export type Retryable<R = unknown> = () => R | Promise<R>;
