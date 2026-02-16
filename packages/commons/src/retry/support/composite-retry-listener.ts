import type { RetryException } from "../retry-exception";
import type { RetryListener } from "../retry-listener.interface";
import type { RetryPolicy } from "../retry-policy";
import type { RetryState } from "../retry-state";
import type { Retryable } from "../retryable.interface";

/**
 * A composite implementation of the {@link RetryListener} interface, which is
 * used to compose multiple listeners within a {@link RetryTemplate}.
 *
 * Delegate listeners will be called in their registration order.
 */
export class CompositeRetryListener implements RetryListener {
  private readonly listeners: RetryListener[] = [];

  /**
   * Create a new `CompositeRetryListener` with the supplied list of
   * delegates.
   *
   * @param listeners the list of delegate listeners to register
   * @see addListener
   */
  constructor(listeners: RetryListener[] = []) {
    this.listeners = [...listeners];
  }

  /**
   * Add a new listener to the list of delegates.
   *
   * @param listener the listener to add
   */
  addListener(listener: RetryListener): void {
    this.listeners.push(listener);
  }

  onRetryableExecution(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    retryState: RetryState,
  ): void {
    for (const l of this.listeners) {
      l.onRetryableExecution?.(
        retryPolicy,
        retryable,
        retryableName,
        retryState,
      );
    }
  }

  beforeRetry(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
  ): void {
    for (const l of this.listeners) {
      l.beforeRetry?.(retryPolicy, retryable, retryableName);
    }
  }

  onRetryFailure(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    throwable: unknown,
  ): void {
    for (const l of this.listeners) {
      l.onRetryFailure?.(retryPolicy, retryable, retryableName, throwable);
    }
  }

  onRetrySuccess(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    result: unknown,
  ): void {
    for (const l of this.listeners) {
      l.onRetrySuccess?.(retryPolicy, retryable, retryableName, result);
    }
  }

  onRetryPolicyExhaustion(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    exception: RetryException,
  ): void {
    for (const l of this.listeners) {
      l.onRetryPolicyExhaustion?.(
        retryPolicy,
        retryable,
        retryableName,
        exception,
      );
    }
  }

  onRetryPolicyTimeout(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    exception: RetryException,
  ): void {
    for (const l of this.listeners) {
      l.onRetryPolicyTimeout?.(
        retryPolicy,
        retryable,
        retryableName,
        exception,
      );
    }
  }

  onRetryPolicyInterruption(
    retryPolicy: RetryPolicy,
    retryable: Retryable,
    retryableName: string,
    exception: RetryException,
  ): void {
    for (const l of this.listeners) {
      l.onRetryPolicyInterruption?.(
        retryPolicy,
        retryable,
        retryableName,
        exception,
      );
    }
  }
}
