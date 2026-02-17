import assert from "node:assert/strict";
import { type Milliseconds, ms } from "../temporal";
import type { BackOff } from "./back-off.interface";
import { DefaultRetryPolicy } from "./default-retry-policy";
import { ExponentialBackOff } from "./exponential-back-off";
import { FixedBackOff } from "./fixed-back-off";

/**
 * Strategy interface to define a retry policy.
 *
 * Also provides factory methods and a fluent builder API for creating retry
 * policies with common configurations. See {@link withDefaults},
 * {@link withMaxRetries}, {@link builder}, and the configuration
 * options in {@link RetryPolicyBuilder} for details.
 *
 * @see Retryable
 * @see RetryTemplate
 * @see BackOff
 */
export abstract class RetryPolicy {
  /**
   * Specify if the {@link Retryable} operation should be retried based on the
   * given throwable.
   * @param throwable the exception that caused the operation to fail
   * @returns true if the operation should be retried, false otherwise
   */
  abstract shouldRetry(throwable: Error): boolean;

  /**
   * Get the timeout to use for this retry policy.
   *
   * The returned value represents the maximum amount of elapsed
   * time allowed for the initial invocation and any subsequent retry attempts,
   * including delays, in milliseconds.
   *
   * Defaults to 0 which signals that no timeout should be applied.
   * @see RetryPolicyBuilder#timeout
   */
  get timeout(): Milliseconds {
    return ms(0);
  }

  /**
   * Get the {@link BackOff} strategy to use for this retry policy.
   *
   * Defaults to a fixed backoff of {@link RetryPolicyBuilder.DEFAULT_DELAY} milliseconds
   * and maximum {@link RetryPolicyBuilder.DEFAULT_MAX_RETRIES} retries.
   *
   * Note that {@code total attempts = 1 initial attempt + maxRetries attempts}.
   * Thus, when {@code maxRetries} is set to 3, a retryable operation will be
   * invoked at least once and at most 4 times.
   * @see FixedBackOff
   */
  get backOff(): BackOff {
    return new FixedBackOff(
      RetryPolicyBuilder.DEFAULT_DELAY,
      RetryPolicyBuilder.DEFAULT_MAX_RETRIES,
    );
  }

  /**
   * Create a {@link RetryPolicy} with default configuration.
   *
   * The returned policy applies to all exception types, uses a fixed backoff
   * of {@link RetryPolicyBuilder.DEFAULT_DELAY} milliseconds, and supports maximum
   * {@link RetryPolicyBuilder.DEFAULT_MAX_RETRIES} retries.
   *
   * Note that {@code total attempts = 1 initial attempt + maxRetries attempts}.
   * Thus, when {@code maxRetries} is set to 3, a retryable operation will be
   * invoked at least once and at most 4 times.
   * @see FixedBackOff
   */
  static withDefaults(): RetryPolicy {
    return RetryPolicy.builder().build();
  }

  /**
   * Create a {@link RetryPolicy} configured with a maximum number of retry attempts.
   *
   * Note that {@code total attempts = 1 initial attempt + maxRetries attempts}.
   * Thus, if {@code maxRetries} is set to 4, a retryable operation will be invoked
   * at least once and at most 5 times.
   *
   * The returned policy applies to all exception types and uses a fixed backoff
   * of {@link RetryPolicyBuilder.DEFAULT_DELAY} milliseconds.
   * @param maxRetries the maximum number of retry attempts;
   * must be positive (or zero for no retry)
   * @see RetryPolicyBuilder#maxRetries
   * @see FixedBackOff
   */
  static withMaxRetries(maxRetries: number): RetryPolicy {
    assertMaxRetriesIsNotNegative(maxRetries);
    return RetryPolicy.builder()
      .backOff(new FixedBackOff(RetryPolicyBuilder.DEFAULT_DELAY, maxRetries))
      .build();
  }

  /**
   * Create a {@link RetryPolicyBuilder} to configure a {@link RetryPolicy} with common
   * configuration options.
   */
  static builder(): RetryPolicyBuilder {
    return new RetryPolicyBuilder();
  }
}

function assertMaxRetriesIsNotNegative(maxRetries: number): void {
  assert(
    maxRetries >= 0,
    `Invalid maxRetries (${maxRetries}): must be positive or zero for no retry.`,
  );
}

function assertIsNotNegative(name: string, value: number): void {
  assert(
    value >= 0,
    `Invalid ${name} (${value}ms): must be greater than or equal to zero.`,
  );
}

function assertIsPositive(name: string, value: number): void {
  assert(value > 0, `Invalid ${name} (${value}ms): must be greater than zero.`);
}

/**
 * Fluent API for configuring a {@link RetryPolicy} with common configuration
 * options.
 */
export class RetryPolicyBuilder {
  /**
   * The default {@link maxRetries} value: {@value}.
   */
  static readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * The default {@link delay} value: {@value} ms.
   */
  static readonly DEFAULT_DELAY: Milliseconds = ms(1000);

  /**
   * The default {@link maxDelay} value: {@value} ms.
   */
  static readonly DEFAULT_MAX_DELAY: Milliseconds = ms(Number.MAX_SAFE_INTEGER);

  /**
   * The default {@link multiplier} value: {@value}.
   */
  static readonly DEFAULT_MULTIPLIER = 1.0;

  private _backOff?: BackOff;
  private _maxRetries?: number;
  private _timeout: Milliseconds = ms(0);
  private _delay?: Milliseconds;
  private _jitter?: Milliseconds;
  private _multiplier?: number;
  private _maxDelay?: Milliseconds;
  private readonly _includes: Array<new (...args: never[]) => Error> = [];
  private readonly _excludes: Array<new (...args: never[]) => Error> = [];
  private _predicate?: (throwable: unknown) => boolean;

  /**
   * Specify the {@link BackOff} strategy to use.
   *
   * The supplied value will override any previously configured value.
   *
   * **WARNING**: If you configure a custom {@code BackOff}
   * strategy, you should not configure any of the following:
   * {@link maxRetries}, {@link delay},
   * {@link jitter}, {@link multiplier},
   * or {@link maxDelay}.
   * @param backOff the BackOff strategy
   * @returns this Builder instance for chained method invocations
   */
  backOff(backOff: BackOff): this {
    assert(backOff != null, "BackOff must not be null");
    this._backOff = backOff;
    return this;
  }

  /**
   * Specify the maximum number of retry attempts.
   *
   * Note that {@code total attempts = 1 initial attempt + maxRetries attempts}.
   * Thus, if {@code maxRetries} is set to 4, a retryable operation will be
   * invoked at least once and at most 5 times.
   *
   * The default is {@link RetryPolicyBuilder.DEFAULT_MAX_RETRIES}.
   *
   * The supplied value will override any previously configured value.
   *
   * You should not specify this configuration option if you have
   * configured a custom {@link backOff} strategy.
   * @param maxRetries the maximum number of retry attempts;
   * must be positive (or zero for no retry)
   * @returns this Builder instance for chained method invocations
   */
  maxRetries(maxRetries: number): this {
    assertMaxRetriesIsNotNegative(maxRetries);
    this._maxRetries = maxRetries;
    return this;
  }

  /**
   * Specify a timeout for the maximum amount of elapsed time allowed for
   * the initial invocation and any subsequent retry attempts, including
   * delays.
   *
   * The default is 0, which signals that no timeout should be applied.
   *
   * The supplied value will override any previously configured value.
   * @param timeout the timeout in milliseconds;
   * must be greater than or equal to zero
   * @returns this Builder instance for chained method invocations
   */
  timeout(timeout: Milliseconds): this {
    assertIsNotNegative("timeout", timeout);
    this._timeout = timeout;
    return this;
  }

  /**
   * Specify the base delay after the initial invocation.
   *
   * If a {@link multiplier} is specified, this
   * serves as the initial delay to multiply from.
   *
   * The default is {@link RetryPolicyBuilder.DEFAULT_DELAY} milliseconds.
   *
   * The supplied value will override any previously configured value.
   *
   * You should not specify this configuration option if you have
   * configured a custom {@link backOff} strategy.
   * @param delay the base delay in milliseconds;
   * must be greater than or equal to zero
   * @returns this Builder instance for chained method invocations
   * @see jitter
   * @see multiplier
   * @see maxDelay
   */
  delay(delay: Milliseconds): this {
    assertIsNotNegative("delay", delay);
    this._delay = delay;
    return this;
  }

  /**
   * Specify a jitter value for the base retry attempt, randomly subtracted
   * or added to the calculated delay, resulting in a value between
   * {@code delay - jitter} and {@code delay + jitter} but never below the
   * {@link delay} or above the {@link maxDelay}.
   *
   * If a {@link multiplier} is specified, it
   * is applied to the jitter value as well.
   *
   * The default is no jitter.
   *
   * The supplied value will override any previously configured value.
   *
   * You should not specify this configuration option if you have
   * configured a custom {@link backOff} strategy.
   * @param jitter the jitter value in milliseconds; must be
   * greater than or equal to zero
   * @returns this Builder instance for chained method invocations
   * @see delay
   * @see multiplier
   * @see maxDelay
   */
  jitter(jitter: Milliseconds): this {
    assertIsNotNegative("jitter", jitter);
    this._jitter = jitter;
    return this;
  }

  /**
   * Specify a multiplier for a delay for the next retry attempt, applied
   * to the previous delay (starting with the initial {@link delay})
   * as well as to the applicable {@link jitter} for each attempt.
   *
   * The default is {@link RetryPolicyBuilder.DEFAULT_MULTIPLIER}, effectively
   * resulting in a fixed delay.
   *
   * The supplied value will override any previously configured value.
   *
   * You should not specify this configuration option if you have
   * configured a custom {@link backOff} strategy.
   * @param multiplier the multiplier value; must be greater than or equal to 1
   * @returns this Builder instance for chained method invocations
   * @see delay
   * @see jitter
   * @see maxDelay
   */
  multiplier(multiplier: number): this {
    assert(
      multiplier >= 1,
      `Invalid multiplier '${multiplier}': must be greater than or equal to 1. A multiplier of 1 is equivalent to a fixed delay.`,
    );
    this._multiplier = multiplier;
    return this;
  }

  /**
   * Specify the maximum delay for any retry attempt, limiting how far
   * {@link jitter} and the {@link multiplier} can increase the {@link delay}.
   *
   * The default is unlimited.
   *
   * The supplied value will override any previously configured value.
   *
   * You should not specify this configuration option if you have
   * configured a custom {@link backOff} strategy.
   * @param maxDelay the maximum delay in milliseconds; must be greater than zero
   * @returns this Builder instance for chained method invocations
   * @see delay
   * @see jitter
   * @see multiplier
   */
  maxDelay(maxDelay: Milliseconds): this {
    assertIsPositive("maxDelay", maxDelay);
    this._maxDelay = maxDelay;
    return this;
  }

  /**
   * Specify the types of exceptions for which the {@link RetryPolicy}
   * should retry a failed operation.
   *
   * Defaults to all exception types.
   *
   * The supplied exception types will be matched against an exception
   * thrown by a failed operation as well as nested causes.
   *
   * If included exception types have already been configured, the supplied
   * types will be added to the existing list of included types.
   *
   * This can be combined with other includes, excludes,
   * and a custom predicate.
   * @param types the types of exceptions to include in the policy
   * @returns this Builder instance for chained method invocations
   * @see excludes
   * @see predicate
   */
  includes(...types: Array<new (...args: never[]) => Error>): this {
    this._includes.push(...types);
    return this;
  }

  /**
   * Specify the types of exceptions for which the {@link RetryPolicy}
   * should not retry a failed operation.
   *
   * The supplied exception types will be matched against an exception
   * thrown by a failed operation as well as nested causes.
   *
   * If excluded exception types have already been configured, the supplied
   * types will be added to the existing list of excluded types.
   *
   * This can be combined with includes, other excludes,
   * and a custom predicate.
   * @param types the types of exceptions to exclude from the policy
   * @returns this Builder instance for chained method invocations
   * @see includes
   * @see predicate
   */
  excludes(...types: Array<new (...args: never[]) => Error>): this {
    this._excludes.push(...types);
    return this;
  }

  /**
   * Specify a custom predicate that the {@link RetryPolicy} will
   * use to determine whether to retry a failed operation based on a given
   * throwable.
   *
   * If a predicate has already been configured, the supplied predicate
   * will be combined with the existing predicate using AND logic.
   *
   * This can be combined with includes and excludes.
   * @param predicate a custom predicate
   * @returns this Builder instance for chained method invocations
   * @see includes
   * @see excludes
   */
  predicate(predicate: (throwable: unknown) => boolean): this {
    if (this._predicate) {
      const existingPredicate = this._predicate;
      this._predicate = (t) => existingPredicate(t) && predicate(t);
    } else {
      this._predicate = predicate;
    }
    return this;
  }

  /**
   * Build the configured {@link RetryPolicy}.
   */
  build(): RetryPolicy {
    let backOff = this._backOff;
    if (backOff != null) {
      const misconfigured =
        this._maxRetries != null ||
        this._delay != null ||
        this._jitter != null ||
        this._multiplier != null ||
        this._maxDelay != null;
      assert(
        !misconfigured,
        "The following configuration options are not supported with a custom BackOff strategy: " +
          "maxRetries, delay, jitter, multiplier, or maxDelay.",
      );
    } else {
      const exponentialBackOff = new ExponentialBackOff();
      exponentialBackOff.maxAttempts =
        this._maxRetries ?? RetryPolicyBuilder.DEFAULT_MAX_RETRIES;
      exponentialBackOff.initialInterval =
        this._delay ?? RetryPolicyBuilder.DEFAULT_DELAY;
      exponentialBackOff.maxInterval =
        this._maxDelay ?? RetryPolicyBuilder.DEFAULT_MAX_DELAY;
      exponentialBackOff.multiplier =
        this._multiplier ?? RetryPolicyBuilder.DEFAULT_MULTIPLIER;
      if (this._jitter != null) {
        exponentialBackOff.setJitter(this._jitter);
      }
      backOff = exponentialBackOff;
    }
    return new DefaultRetryPolicy(
      this._includes,
      this._excludes,
      this._predicate,
      this._timeout,
      backOff,
    );
  }
}
