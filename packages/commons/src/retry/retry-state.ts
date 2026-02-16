/**
 * A representation of the current retry state, including the
 * current retry count and the exceptions accumulated so far.
 *
 * Used as a parameter for {@link RetryListener#onRetryableExecution}.
 * Implemented by {@link RetryException} as well, exposing the final outcome in
 * the terminal listener methods {@link RetryListener#onRetryPolicyExhaustion},
 * {@link RetryListener#onRetryPolicyInterruption} and
 * {@link RetryListener#onRetryPolicyTimeout}.
 */
export abstract class RetryState {
  /**
   * Return the current retry count: 0 indicates the initial invocation,
   * 1 the first retry attempt, etc.
   *
   * This may indicate the current attempt or the final number of
   * retry attempts, depending on the time of the method call.
   */
  abstract get retryCount(): number;

  /**
   * Return the invocation exceptions accumulated so far,
   * in the order of occurrence.
   */
  abstract get exceptions(): readonly unknown[];

  /**
   * Return the recorded exception from the last invocation.
   * @throws Error if no exception has been recorded
   */
  get lastException(): unknown {
    const exceptions = this.exceptions;
    if (exceptions.length === 0) {
      throw new Error("No exception recorded");
    }
    return exceptions[exceptions.length - 1];
  }

  /**
   * Indicate whether a successful invocation has been accomplished.
   */
  get isSuccessful(): boolean {
    return this.retryCount >= this.exceptions.length;
  }
}
