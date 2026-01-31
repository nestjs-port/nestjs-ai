import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ms } from "../../temporal";
import {
	type Retryable,
	RetryException,
	type RetryListener,
	RetryPolicy,
	RetryTemplate,
} from "../index";

/**
 * Integration tests for {@link RetryTemplate}, {@link RetryPolicy} and
 * {@link RetryListener}.
 *
 * @see RetryPolicyTests
 */
describe("RetryTemplate", () => {
	let retryPolicy: RetryPolicy;
	let retryTemplate: RetryTemplate;
	let mockListener: MockRetryListener;

	beforeEach(() => {
		retryPolicy = RetryPolicy.builder().maxRetries(3).delay(ms(0)).build();
		retryTemplate = new RetryTemplate(retryPolicy);
		mockListener = createMockRetryListener();
		retryTemplate.retryListener = mockListener;
	});

	it("check retry template configuration", () => {
		expect(retryTemplate.retryPolicy).toBe(retryPolicy);
		expect(retryTemplate.retryListener).toBe(mockListener);
	});

	it("retryable with immediate success", async () => {
		let invocationCount = 0;
		const retryable: Retryable<string> = () => {
			invocationCount++;
			return "always succeeds";
		};

		expect(invocationCount).toBe(0);
		expect(await retryTemplate.execute(retryable, "test")).toBe(
			"always succeeds",
		);
		expect(invocationCount).toBe(1);

		// RetryListener interactions:
		expect(mockListener.onRetryableExecution).toHaveBeenCalledTimes(1);
		expect(mockListener.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			expect.objectContaining({
				isSuccessful: true,
				retryCount: 0,
			}),
		);
		expectNoMoreInteractions(mockListener);
	});

	it("retryable with initial failure and zero retries retry policy", async () => {
		const zeroRetriesPolicy = RetryPolicy.builder()
			.maxRetries(0)
			.delay(ms(0))
			.predicate(() => false) // Zero retries
			.build();
		const template = new RetryTemplate(zeroRetriesPolicy);
		template.retryListener = mockListener;
		const exception = new Error("Boom!");
		const retryable: Retryable<string> = () => {
			throw exception;
		};

		await expect(template.execute(retryable, "test")).rejects.toThrow(
			RetryException,
		);

		try {
			await template.execute(retryable, "test2");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toMatch(
				/Retry policy for operation '.+?' exhausted; aborting execution/,
			);
			expect(retryException.cause).toBe(exception);
			expect(retryException.retryCount).toBe(0);
			expect(retryException.exceptions).toEqual([exception]);
			expect(retryException.lastException).toBe(exception);
		}
	});

	it("retryable with initial failure and zero retries fixed back off policy", async () => {
		const zeroRetriesPolicy = RetryPolicy.withMaxRetries(0);
		const template = new RetryTemplate(zeroRetriesPolicy);
		template.retryListener = mockListener;
		const exception = new Error("Boom!");
		const retryable: Retryable<string> = () => {
			throw exception;
		};

		try {
			await template.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toMatch(
				/Retry policy for operation '.+?' exhausted; aborting execution/,
			);
			expect(retryException.cause).toBe(exception);
			expect(retryException.retryCount).toBe(0);
			expect(retryException.exceptions).toEqual([exception]);
			expect(retryException.lastException).toBe(exception);
		}
	});

	it("retryable with initial failure and zero retries back off policy from builder", async () => {
		const zeroRetriesPolicy = RetryPolicy.builder()
			.maxRetries(0)
			.delay(ms(0))
			.build();
		const template = new RetryTemplate(zeroRetriesPolicy);
		template.retryListener = mockListener;
		const exception = new Error("Boom!");
		const retryable: Retryable<string> = () => {
			throw exception;
		};

		try {
			await template.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toMatch(
				/Retry policy for operation '.+?' exhausted; aborting execution/,
			);
			expect(retryException.cause).toBe(exception);
			expect(retryException.retryCount).toBe(0);
			expect(retryException.exceptions).toEqual([exception]);
			expect(retryException.lastException).toBe(exception);
		}
	});

	it("retryable with success after initial failures", async () => {
		let invocationCount = 0;
		const retryable: Retryable<string> = () => {
			invocationCount++;
			if (invocationCount <= 2) {
				throw new CustomException(`Boom ${invocationCount}`);
			}
			return "finally succeeded";
		};

		expect(invocationCount).toBe(0);
		expect(await retryTemplate.execute(retryable, "test")).toBe(
			"finally succeeded",
		);
		expect(invocationCount).toBe(3);

		// RetryListener interactions:
		// First failure
		expect(mockListener.onRetryableExecution).toHaveBeenCalled();
		expect(mockListener.beforeRetry).toHaveBeenCalled();
		expect(mockListener.onRetryFailure).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			expect.any(CustomException),
		);
		// Second failure then success
		expect(mockListener.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			"finally succeeded",
		);

		// Final call shows success with retryCount = 2
		const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
		expect(lastCall?.[3]).toMatchObject({
			isSuccessful: true,
			retryCount: 2,
		});
	});

	it("retryable with exhausted policy", async () => {
		let invocationCount = 0;
		const retryable: Retryable<string> = () => {
			invocationCount++;
			throw new CustomException(`Boom ${invocationCount}`);
		};

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toBe(
				"Retry policy for operation 'test' exhausted; aborting execution",
			);
			expect(retryException.cause).toEqual(new CustomException("Boom 4"));

			// Final onRetryableExecution should show failure with retryCount = 3
			const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
			expect(lastCall?.[3]).toMatchObject({
				isSuccessful: false,
				retryCount: 3,
			});

			expect(mockListener.onRetryPolicyExhaustion).toHaveBeenCalledWith(
				retryPolicy,
				retryable,
				"test",
				retryException,
			);
		}
		// 4 = 1 initial invocation + 3 retry attempts
		expect(invocationCount).toBe(4);
	});

	it("retryable with failing retryable and multiple predicates", async () => {
		let invocationCount = 0;
		const exception = new NumberFormatError("Boom!");

		const retryable: Retryable<string> = () => {
			invocationCount++;
			throw exception;
		};

		const multiPredicatePolicy = RetryPolicy.builder()
			.maxRetries(5)
			.delay(ms(1))
			.predicate((t) => t instanceof NumberFormatError)
			.predicate((t) => (t as Error).message === "Boom!")
			.build();

		retryTemplate.retryPolicy = multiPredicatePolicy;

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "always fails");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toBe(
				"Retry policy for operation 'always fails' exhausted; aborting execution",
			);
			expect(retryException.cause).toBe(exception);

			// Final onRetryableExecution should show failure with retryCount = 5
			const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
			expect(lastCall?.[3]).toMatchObject({
				isSuccessful: false,
				retryCount: 5,
			});

			expect(mockListener.onRetryPolicyExhaustion).toHaveBeenCalled();
		}
		// 6 = 1 initial invocation + 5 retry attempts
		expect(invocationCount).toBe(6);
	});

	it("retryable with exception includes", async () => {
		let invocationCount = 0;

		const retryable: Retryable<string> = () => {
			invocationCount++;
			switch (invocationCount) {
				case 1:
					throw new FileNotFoundError();
				case 2:
					throw new IOError("io");
				case 3:
					throw new IllegalStateError();
				default:
					return "success";
			}
		};

		const includesPolicy = RetryPolicy.builder()
			.maxRetries(Number.MAX_SAFE_INTEGER)
			.delay(ms(0))
			.includes(IOError)
			.build();

		retryTemplate.retryPolicy = includesPolicy;

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toBe(
				"Retry policy for operation 'test' exhausted; aborting execution",
			);
			expect(retryException.cause).toBeInstanceOf(IllegalStateError);
			expect(retryException.retryCount).toBe(2);

			// Check suppressed exceptions
			const exceptions = retryException.exceptions;
			expect(exceptions.length).toBe(3);
			expect(exceptions[0]).toBeInstanceOf(FileNotFoundError);
			expect(exceptions[1]).toBeInstanceOf(IOError);
			expect(exceptions[2]).toBeInstanceOf(IllegalStateError);
		}
		// 3 = 1 initial invocation + 2 retry attempts
		expect(invocationCount).toBe(3);
	});

	it("retryable with exception excludes", async () => {
		const excludesPolicy = RetryPolicy.builder()
			.maxRetries(Number.MAX_SAFE_INTEGER)
			.delay(ms(0))
			.excludes(FileNotFoundError)
			.build();

		retryTemplate.retryPolicy = excludesPolicy;

		let invocationCount = 0;

		const retryable: Retryable<string> = () => {
			invocationCount++;
			switch (invocationCount) {
				case 1:
					throw new IOError("io");
				case 2:
					throw new IllegalStateError("state");
				case 3:
					throw new CustomFileNotFoundError();
				default:
					return "success";
			}
		};

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toBe(
				"Retry policy for operation 'test' exhausted; aborting execution",
			);
			expect(retryException.cause).toBeInstanceOf(CustomFileNotFoundError);
			expect(retryException.retryCount).toBe(2);

			// Check suppressed exceptions
			const exceptions = retryException.exceptions;
			expect(exceptions.length).toBe(3);
			expect(exceptions[0]).toBeInstanceOf(IOError);
			expect(exceptions[1]).toBeInstanceOf(IllegalStateError);
			expect(exceptions[2]).toBeInstanceOf(CustomFileNotFoundError);
		}
		// 3 = 1 initial invocation + 2 retry attempts
		expect(invocationCount).toBe(3);
	});

	it("retryable with exception includes and excludes", async () => {
		const includesAndExcludesPolicy = RetryPolicy.builder()
			.maxRetries(Number.MAX_SAFE_INTEGER)
			.delay(ms(0))
			.includes(IOError)
			.excludes(FileNotFoundError)
			.build();

		retryTemplate.retryPolicy = includesAndExcludesPolicy;

		let invocationCount = 0;

		const retryable: Retryable<string> = () => {
			invocationCount++;
			switch (invocationCount) {
				case 1:
					throw new IOError("io");
				case 2:
					throw new FileSystemError("fs"); // Another IOError subclass, not excluded
				case 3:
					throw new CustomFileNotFoundError(); // Excluded (extends FileNotFoundError)
				default:
					return "success";
			}
		};

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.message).toBe(
				"Retry policy for operation 'test' exhausted; aborting execution",
			);
			expect(retryException.cause).toBeInstanceOf(CustomFileNotFoundError);
			expect(retryException.retryCount).toBe(2);

			// Check suppressed exceptions
			const exceptions = retryException.exceptions;
			expect(exceptions.length).toBe(3);
			expect(exceptions[0]).toBeInstanceOf(IOError);
			expect(exceptions[1]).toBeInstanceOf(FileSystemError);
			expect(exceptions[2]).toBeInstanceOf(CustomFileNotFoundError);
		}
		// 3 = 1 initial invocation + 2 retry attempts
		expect(invocationCount).toBe(3);
	});

	it("retryable with immediate success as function", async () => {
		let invocationCount = 0;
		const retryable = () => {
			invocationCount++;
			return "always succeeds";
		};

		expect(invocationCount).toBe(0);
		expect(await retryTemplate.execute(retryable, "test")).toBe(
			"always succeeds",
		);
		expect(invocationCount).toBe(1);

		// RetryListener interactions:
		expect(mockListener.onRetryableExecution).toHaveBeenCalledTimes(1);
		expect(mockListener.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			expect.objectContaining({
				isSuccessful: true,
				retryCount: 0,
			}),
		);
	});

	it("retryable async with success after initial failures", async () => {
		let invocationCount = 0;
		const retryable: Retryable<string> = async () => {
			invocationCount++;
			if (invocationCount <= 2) {
				throw new CustomException(`Boom ${invocationCount}`);
			}
			return "finally succeeded";
		};

		expect(invocationCount).toBe(0);
		expect(await retryTemplate.execute(retryable, "test")).toBe(
			"finally succeeded",
		);
		expect(invocationCount).toBe(3);

		expect(mockListener.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			"finally succeeded",
		);

		// Final call shows success with retryCount = 2
		const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
		expect(lastCall?.[3]).toMatchObject({
			isSuccessful: true,
			retryCount: 2,
		});
	});

	it("retryable with exhausted policy as function", async () => {
		let invocationCount = 0;
		const retryable = () => {
			invocationCount++;
			throw new CustomException(`Boom ${invocationCount}`);
		};

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.cause).toEqual(new CustomException("Boom 4"));

			const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
			expect(lastCall?.[3]).toMatchObject({
				isSuccessful: false,
				retryCount: 3,
			});

			expect(mockListener.onRetryPolicyExhaustion).toHaveBeenCalled();
		}
		// 4 = 1 initial invocation + 3 retry attempts
		expect(invocationCount).toBe(4);
	});

	it("void retryable with immediate success", async () => {
		let invocationCount = 0;
		const retryable: Retryable<void> = () => {
			invocationCount++;
		};

		expect(invocationCount).toBe(0);
		await retryTemplate.execute(retryable, "test");
		expect(invocationCount).toBe(1);

		// RetryListener interactions:
		expect(mockListener.onRetryableExecution).toHaveBeenCalledTimes(1);
		expect(mockListener.onRetryableExecution).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			expect.objectContaining({
				isSuccessful: true,
				retryCount: 0,
			}),
		);
	});

	it("void retryable with success after initial failures", async () => {
		let invocationCount = 0;
		const retryable: Retryable<void> = () => {
			invocationCount++;
			if (invocationCount <= 2) {
				throw new CustomException(`Boom ${invocationCount}`);
			}
		};

		expect(invocationCount).toBe(0);
		await retryTemplate.execute(retryable, "test");
		expect(invocationCount).toBe(3);

		expect(mockListener.onRetrySuccess).toHaveBeenCalledWith(
			retryPolicy,
			retryable,
			"test",
			undefined,
		);

		// Final call shows success with retryCount = 2
		const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
		expect(lastCall?.[3]).toMatchObject({
			isSuccessful: true,
			retryCount: 2,
		});
	});

	it("void retryable with exhausted policy", async () => {
		let invocationCount = 0;
		const retryable: Retryable<void> = () => {
			invocationCount++;
			throw new CustomException(`Boom ${invocationCount}`);
		};

		expect(invocationCount).toBe(0);
		try {
			await retryTemplate.execute(retryable, "test");
		} catch (e) {
			expect(e).toBeInstanceOf(RetryException);
			const retryException = e as RetryException;
			expect(retryException.cause).toEqual(new CustomException("Boom 4"));

			const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
			expect(lastCall?.[3]).toMatchObject({
				isSuccessful: false,
				retryCount: 3,
			});

			expect(mockListener.onRetryPolicyExhaustion).toHaveBeenCalled();
		}
		// 4 = 1 initial invocation + 3 retry attempts
		expect(invocationCount).toBe(4);
	});

	describe("Timeout Tests", () => {
		it("retryable with immediate success and timeout exceeded", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(10))
				.delay(ms(0))
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			let invocationCount = 0;
			const retryable: Retryable<string> = async () => {
				invocationCount++;
				await sleep(100);
				return "always succeeds";
			};

			expect(invocationCount).toBe(0);
			expect(await template.execute(retryable, "test")).toBe("always succeeds");
			expect(invocationCount).toBe(1);

			// RetryListener interactions:
			expect(mockListener.onRetryableExecution).toHaveBeenCalledTimes(1);
			expect(mockListener.onRetryableExecution).toHaveBeenCalledWith(
				timeoutPolicy,
				retryable,
				"test",
				expect.objectContaining({
					isSuccessful: true,
					retryCount: 0,
				}),
			);
		});

		it("retryable with initial failure and zero retries retry policy and timeout exceeded", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(10))
				.delay(ms(0))
				.predicate(() => false) // Zero retries
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			const exception = new Error("Boom!");
			const retryable: Retryable<string> = async () => {
				await sleep(100);
				throw exception;
			};

			try {
				await template.execute(retryable, "test");
			} catch (e) {
				expect(e).toBeInstanceOf(RetryException);
				const retryException = e as RetryException;
				expect(retryException.message).toMatch(
					/Retry policy for operation '.+?' exhausted; aborting execution/,
				);
				expect(retryException.cause).toBe(exception);
				expect(retryException.retryCount).toBe(0);

				expect(mockListener.onRetryPolicyExhaustion).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					retryException,
				);
			}
		});

		it("retryable with timeout exceeded after initial failure", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(10))
				.delay(ms(0))
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			let invocationCount = 0;
			const retryable: Retryable<string> = async () => {
				await sleep(100);
				invocationCount++;
				throw new CustomException(`Boom ${invocationCount}`);
			};

			expect(invocationCount).toBe(0);
			try {
				await template.execute(retryable, "test");
			} catch (e) {
				expect(e).toBeInstanceOf(RetryException);
				const retryException = e as RetryException;
				expect(retryException.message).toMatch(
					/Retry policy for operation '.+?' exceeded timeout \(10ms\); aborting execution/,
				);
				expect(retryException.cause).toEqual(new CustomException("Boom 1"));

				expect(mockListener.onRetryPolicyTimeout).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					retryException,
				);
			}
			expect(invocationCount).toBe(1);
		});

		it("retryable with timeout exceeded after first delay but before first retry", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(20))
				.delay(ms(100)) // Delay > Timeout
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			let invocationCount = 0;
			const retryable: Retryable<string> = () => {
				invocationCount++;
				throw new CustomException(`Boom ${invocationCount}`);
			};

			expect(invocationCount).toBe(0);
			try {
				await template.execute(retryable, "test");
			} catch (e) {
				expect(e).toBeInstanceOf(RetryException);
				const retryException = e as RetryException;
				expect(retryException.message).toMatch(
					/Retry policy for operation '.+?' would exceed timeout \(20ms\) due to pending sleep time \(100ms\); preemptively aborting execution/,
				);
				expect(retryException.cause).toEqual(new CustomException("Boom 1"));

				expect(mockListener.onRetryPolicyTimeout).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					retryException,
				);
			}
			expect(invocationCount).toBe(1);
		});

		it("retryable with timeout exceeded after first retry", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(20))
				.delay(ms(0))
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			let invocationCount = 0;
			const retryable: Retryable<string> = async () => {
				const currentInvocation = ++invocationCount;
				if (currentInvocation === 2) {
					await sleep(100);
				}
				throw new CustomException(`Boom ${currentInvocation}`);
			};

			expect(invocationCount).toBe(0);
			try {
				await template.execute(retryable, "test");
			} catch (e) {
				expect(e).toBeInstanceOf(RetryException);
				const retryException = e as RetryException;
				expect(retryException.message).toMatch(
					/Retry policy for operation '.+?' exceeded timeout \(20ms\); aborting execution/,
				);
				expect(retryException.cause).toEqual(new CustomException("Boom 2"));

				expect(mockListener.beforeRetry).toHaveBeenCalled();
				expect(mockListener.onRetryFailure).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					expect.objectContaining({ message: "Boom 2" }),
				);

				const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
				expect(lastCall?.[3]).toMatchObject({
					isSuccessful: false,
					retryCount: 1,
				});

				expect(mockListener.onRetryPolicyTimeout).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					retryException,
				);
			}
			expect(invocationCount).toBe(2);
		});

		it("retryable with timeout exceeded after second retry", async () => {
			const timeoutPolicy = RetryPolicy.builder()
				.timeout(ms(20))
				.delay(ms(0))
				.build();
			const template = new RetryTemplate(timeoutPolicy);
			template.retryListener = mockListener;

			let invocationCount = 0;
			const retryable: Retryable<string> = async () => {
				const currentInvocation = ++invocationCount;
				if (currentInvocation === 3) {
					await sleep(100);
				}
				throw new CustomException(`Boom ${currentInvocation}`);
			};

			expect(invocationCount).toBe(0);
			try {
				await template.execute(retryable, "test");
			} catch (e) {
				expect(e).toBeInstanceOf(RetryException);
				const retryException = e as RetryException;
				expect(retryException.message).toMatch(
					/Retry policy for operation '.+?' exceeded timeout \(20ms\); aborting execution/,
				);
				expect(retryException.cause).toEqual(new CustomException("Boom 3"));

				const lastCall = mockListener.onRetryableExecution.mock.calls.at(-1);
				expect(lastCall?.[3]).toMatchObject({
					isSuccessful: false,
					retryCount: 2,
				});

				expect(mockListener.onRetryPolicyTimeout).toHaveBeenCalledWith(
					timeoutPolicy,
					retryable,
					"test",
					retryException,
				);
			}
			expect(invocationCount).toBe(3);
		});
	});
});

// Helper functions

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MockRetryListener extends RetryListener {
	beforeRetry: Mock;
	onRetryFailure: Mock;
	onRetrySuccess: Mock;
	onRetryableExecution: Mock;
	onRetryPolicyExhaustion: Mock;
	onRetryPolicyTimeout: Mock;
	onRetryPolicyInterruption: Mock;
}

function createMockRetryListener(): MockRetryListener {
	return {
		beforeRetry: vi.fn(),
		onRetryFailure: vi.fn(),
		onRetrySuccess: vi.fn(),
		onRetryableExecution: vi.fn(),
		onRetryPolicyExhaustion: vi.fn(),
		onRetryPolicyTimeout: vi.fn(),
		onRetryPolicyInterruption: vi.fn(),
	};
}

function expectNoMoreInteractions(listener: MockRetryListener): void {
	expect(listener.beforeRetry).not.toHaveBeenCalled();
	expect(listener.onRetryFailure).not.toHaveBeenCalled();
	expect(listener.onRetrySuccess).not.toHaveBeenCalled();
	expect(listener.onRetryPolicyExhaustion).not.toHaveBeenCalled();
	expect(listener.onRetryPolicyTimeout).not.toHaveBeenCalled();
	expect(listener.onRetryPolicyInterruption).not.toHaveBeenCalled();
}

// Custom error classes to simulate Java exception hierarchy

class IOError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "IOError";
	}
}

class FileNotFoundError extends IOError {
	constructor(message?: string) {
		super(message);
		this.name = "FileNotFoundError";
	}
}

class CustomFileNotFoundError extends FileNotFoundError {
	constructor(message?: string) {
		super(message);
		this.name = "CustomFileNotFoundError";
	}
}

class FileSystemError extends IOError {
	constructor(message?: string) {
		super(message);
		this.name = "FileSystemError";
	}
}

class IllegalStateError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "IllegalStateError";
	}
}

class NumberFormatError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "NumberFormatError";
	}
}

/**
 * Custom error that implements equality based on message for use in assertions.
 */
class CustomException extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomException";
	}
}
