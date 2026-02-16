import { describe, expect, it } from "vitest";
import { ms } from "../../temporal";
import { BackOffExecution, RetryPolicy, RetryPolicyBuilder } from "../index";

/**
 * Max retries {@link RetryPolicy} tests.
 */
describe("Max Retries Retry Policy", () => {
  it("max retries", () => {
    const retryPolicy = RetryPolicy.builder()
      .maxRetries(2)
      .delay(ms(0))
      .build();
    const backOffExecution = retryPolicy.backOff.start();
    const throwable = new Error("mock");

    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(0);
    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(0);

    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
  });

  it("max retries zero", () => {
    const retryPolicy = RetryPolicy.builder()
      .maxRetries(0)
      .delay(ms(0))
      .build();
    const backOffExecution = retryPolicy.backOff.start();
    const throwable = new Error("mock");

    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
    expect(retryPolicy.shouldRetry(throwable)).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
  });

  it("max retries and predicate", () => {
    const retryPolicy = RetryPolicy.builder()
      .maxRetries(4)
      .delay(ms(1))
      .predicate((e) => e instanceof SyntaxError)
      .build();

    const backOffExecution = retryPolicy.backOff.start();

    // 4 retries
    expect(retryPolicy.shouldRetry(new SyntaxError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(1);
    expect(retryPolicy.shouldRetry(new TypeError())).toBe(false);
    expect(backOffExecution.nextBackOff()).toBe(1);
    expect(retryPolicy.shouldRetry(new TypeError())).toBe(false);
    expect(backOffExecution.nextBackOff()).toBe(1);
    expect(retryPolicy.shouldRetry(new CustomSyntaxError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(1);

    // After policy exhaustion
    expect(retryPolicy.shouldRetry(new SyntaxError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
    expect(retryPolicy.shouldRetry(new TypeError())).toBe(false);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
  });

  it("max retries with includes and excludes", () => {
    const retryPolicy = RetryPolicy.builder()
      .maxRetries(6)
      .includes(RangeError, URIError)
      .excludes(CustomRangeError, CustomURIError)
      .build();

    const backOffExecution = retryPolicy.backOff.start();

    // 6 retries
    expect(retryPolicy.shouldRetry(new URIError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );
    expect(retryPolicy.shouldRetry(new RangeError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );
    expect(retryPolicy.shouldRetry(new CustomRangeError())).toBe(false);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );
    expect(retryPolicy.shouldRetry(new URIError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );
    expect(retryPolicy.shouldRetry(new CustomURIError())).toBe(false);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );
    expect(retryPolicy.shouldRetry(new URIError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(
      RetryPolicyBuilder.DEFAULT_DELAY,
    );

    // After policy exhaustion
    expect(retryPolicy.shouldRetry(new URIError())).toBe(true);
    expect(backOffExecution.nextBackOff()).toBe(BackOffExecution.STOP);
  });
});

class CustomSyntaxError extends SyntaxError {}

class CustomRangeError extends RangeError {}

class CustomURIError extends URIError {}
