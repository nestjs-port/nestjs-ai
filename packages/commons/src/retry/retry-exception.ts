import assert from "node:assert/strict";

import { RetryState } from "./retry-state";

/**
 * Exception thrown when a {@link RetryPolicy} has been exhausted or interrupted.
 *
 * A {@code RetryException} will typically contain the last exception thrown
 * by the {@link Retryable} operation as the {@link cause} and
 * any exceptions from previous attempts as suppressed exceptions.
 *
 * Implements the {@link RetryState} interface for exposing the final outcome,
 * as a parameter of the terminal listener methods on {@link RetryListener}.
 *
 * @see RetryOperations
 */
export class RetryException extends Error implements RetryState {
  private readonly suppressed: unknown[] = [];

  /**
   * Create a new {@code RetryException} for the supplied message and cause.
   * @param message the detail message
   * @param cause the last exception thrown by the {@link Retryable} operation
   */
  constructor(message: string, cause: unknown);

  /**
   * Create a new {@code RetryException} for the supplied message and state.
   * @param message the detail message
   * @param retryState the final retry state
   * @since 7.0.2
   */
  constructor(message: string, retryState: RetryState);

  constructor(message: string, causeOrState: unknown | RetryState) {
    if (causeOrState instanceof RetryState) {
      const retryState = causeOrState;
      const lastException = retryState.lastException;
      super(message, { cause: lastException });
      const exceptions = retryState.exceptions;
      for (let i = 0; i < exceptions.length - 1; i++) {
        this.suppressed.push(exceptions[i]);
      }
      return;
    }

    assert(causeOrState != null, "cause must not be null");
    super(message, { cause: causeOrState });
  }

  /**
   * Return the number of retry attempts, or 0 if no retry has been attempted
   * after the initial invocation at all.
   */
  get retryCount(): number {
    return this.suppressed.length;
  }

  /**
   * Return all invocation exceptions encountered, in the order of occurrence.
   */
  get exceptions(): readonly unknown[] {
    const exceptions = [...this.suppressed];
    if (this.cause != null) {
      exceptions.push(this.cause);
    }
    return exceptions;
  }

  /**
   * Return the exception from the last invocation (also exposed as the
   */
  get lastException(): unknown {
    return this.cause;
  }

  /**
   * Indicate whether a successful invocation has been accomplished.
   * Always returns false for RetryException.
   */
  get isSuccessful(): boolean {
    return false;
  }
}
