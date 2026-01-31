import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryException } from "../retry-exception";
import type { RetryListener } from "../retry-listener.interface";
import type { RetryPolicy } from "../retry-policy.interface";
import type { RetryState } from "../retry-state";
import type { Retryable } from "../retryable.interface";
import { CompositeRetryListener } from "../support/composite-retry-listener";

/**
 * Tests for {@link CompositeRetryListener}.
 */
describe("CompositeRetryListener", () => {
	const retryPolicy = {} as RetryPolicy;
	const retryable: Retryable = () => {};
	const retryableName = "testRetryable";

	let listener1: RetryListener;
	let listener2: RetryListener;
	let listener3: RetryListener;
	let compositeRetryListener: CompositeRetryListener;

	beforeEach(() => {
		listener1 = {
			beforeRetry: vi.fn(),
			onRetrySuccess: vi.fn(),
			onRetryFailure: vi.fn(),
			onRetryableExecution: vi.fn(),
			onRetryPolicyExhaustion: vi.fn(),
			onRetryPolicyInterruption: vi.fn(),
			onRetryPolicyTimeout: vi.fn(),
		};
		listener2 = {
			beforeRetry: vi.fn(),
			onRetrySuccess: vi.fn(),
			onRetryFailure: vi.fn(),
			onRetryableExecution: vi.fn(),
			onRetryPolicyExhaustion: vi.fn(),
			onRetryPolicyInterruption: vi.fn(),
			onRetryPolicyTimeout: vi.fn(),
		};
		listener3 = {
			beforeRetry: vi.fn(),
			onRetrySuccess: vi.fn(),
			onRetryFailure: vi.fn(),
			onRetryableExecution: vi.fn(),
			onRetryPolicyExhaustion: vi.fn(),
			onRetryPolicyInterruption: vi.fn(),
			onRetryPolicyTimeout: vi.fn(),
		};
		compositeRetryListener = new CompositeRetryListener([listener1, listener2]);
		compositeRetryListener.addListener(listener3);
	});

	it("before retry", () => {
		compositeRetryListener.beforeRetry(retryPolicy, retryable, retryableName);

		expect(listener1.beforeRetry).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
		);
		expect(listener2.beforeRetry).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
		);
		expect(listener3.beforeRetry).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
		);
	});

	it("on retry success", () => {
		const result = { data: "success" };
		compositeRetryListener.onRetrySuccess(
			retryPolicy,
			retryable,
			retryableName,
			result,
		);

		expect(listener1.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			result,
		);
		expect(listener2.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			result,
		);
		expect(listener3.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			result,
		);
	});

	it("on retry failure", () => {
		const exception = new Error("test failure");
		compositeRetryListener.onRetryFailure(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);

		expect(listener1.onRetryFailure).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener2.onRetryFailure).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener3.onRetryFailure).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
	});

	it("on retryable execution", () => {
		const retryState = {
			retryCount: 1,
			exceptions: [new Error("first")],
			get lastException() {
				return this.exceptions[this.exceptions.length - 1];
			},
			get isSuccessful() {
				return false;
			},
		} as RetryState;

		compositeRetryListener.onRetryableExecution(
			retryPolicy,
			retryable,
			retryableName,
			retryState,
		);

		expect(listener1.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			retryState,
		);
		expect(listener2.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			retryState,
		);
		expect(listener3.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			retryState,
		);
	});

	it("on retry policy exhaustion", () => {
		const exception = new RetryException("exhausted", new Error("cause"));
		compositeRetryListener.onRetryPolicyExhaustion(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);

		expect(listener1.onRetryPolicyExhaustion).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener2.onRetryPolicyExhaustion).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener3.onRetryPolicyExhaustion).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
	});

	it("on retry policy interruption", () => {
		const exception = new RetryException("interrupted", new Error("cause"));
		compositeRetryListener.onRetryPolicyInterruption(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);

		expect(listener1.onRetryPolicyInterruption).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener2.onRetryPolicyInterruption).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener3.onRetryPolicyInterruption).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
	});

	it("on retry policy timeout", () => {
		const exception = new RetryException("timeout", new Error("cause"));
		compositeRetryListener.onRetryPolicyTimeout(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);

		expect(listener1.onRetryPolicyTimeout).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener2.onRetryPolicyTimeout).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
		expect(listener3.onRetryPolicyTimeout).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			retryableName,
			exception,
		);
	});

	it("handles listeners without optional methods", () => {
		const partialListener: RetryListener = {};
		const composite = new CompositeRetryListener([partialListener]);

		// Should not throw when calling methods on listeners that don't implement them
		expect(() =>
			composite.beforeRetry(retryPolicy, retryable, retryableName),
		).not.toThrow();
		expect(() =>
			composite.onRetrySuccess(retryPolicy, retryable, retryableName, {}),
		).not.toThrow();
		expect(() =>
			composite.onRetryFailure(
				retryPolicy,
				retryable,
				retryableName,
				new Error(),
			),
		).not.toThrow();
	});
});
