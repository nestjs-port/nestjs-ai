import { describe, expect, it } from "vitest";
import { ms } from "../../temporal";
import { ExponentialBackOff, FixedBackOff, RetryPolicy } from "../index";

/**
 * Unit tests for {@link RetryPolicy} and its builder.
 *
 * @see RetryTemplateTests
 */
describe("RetryPolicy", () => {
	describe("Factory Method Tests", () => {
		it("with defaults", () => {
			const policy = RetryPolicy.withDefaults();

			expect(policy.shouldRetry(new Error())).toBe(true);
			expect(policy.shouldRetry(new TypeError())).toBe(true);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			expect(exponentialBackOff.maxAttempts).toBe(3);
			expect(exponentialBackOff.initialInterval).toBe(1000);
		});

		it("with max retries preconditions", () => {
			expect(() => RetryPolicy.withMaxRetries(-1)).toThrow(
				/Invalid maxRetries \(-1\)/,
			);
		});

		it("with max retries", () => {
			const policy = RetryPolicy.withMaxRetries(5);

			expect(policy.shouldRetry(new Error())).toBe(true);
			expect(policy.shouldRetry(new TypeError())).toBe(true);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(FixedBackOff);
			const fixedBackOff = backOff as FixedBackOff;
			expect(fixedBackOff.maxAttempts).toBe(5);
			expect(fixedBackOff.interval).toBe(1000);
		});
	});

	describe("Builder Tests", () => {
		it("back off plus conflicting config", () => {
			const mockBackOff = new FixedBackOff();
			expect(() =>
				RetryPolicy.builder().backOff(mockBackOff).delay(ms(10)).build(),
			).toThrow(
				"The following configuration options are not supported with a custom BackOff strategy: " +
					"maxRetries, delay, jitter, multiplier, or maxDelay.",
			);
		});

		it("back off", () => {
			const backOff = new FixedBackOff();
			const policy = RetryPolicy.builder().backOff(backOff).build();

			expect(policy.backOff).toBe(backOff);
		});

		it("max retries preconditions", () => {
			expect(() => RetryPolicy.builder().maxRetries(-1)).toThrow(
				/Invalid maxRetries \(-1\)/,
			);
		});

		it("max retries", () => {
			const policy = RetryPolicy.builder().maxRetries(5).build();

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			expect(exponentialBackOff.maxAttempts).toBe(5);
			expect(exponentialBackOff.initialInterval).toBe(1000);

			assertExponentialBackOff(exponentialBackOff, {
				initialInterval: 1000,
				jitter: 0,
				multiplier: 1.0,
				maxInterval: Number.MAX_SAFE_INTEGER,
				maxAttempts: 5,
			});
		});

		it("timeout preconditions", () => {
			expect(() => RetryPolicy.builder().timeout(ms(-1))).toThrow(
				"Invalid timeout (-1ms): must be greater than or equal to zero.",
			);
		});

		it("timeout", () => {
			const timeout = ms(42);

			const policy = RetryPolicy.builder().timeout(timeout).build();

			expect(policy.timeout).toBe(timeout);
		});

		it("delay preconditions", () => {
			expect(() => RetryPolicy.builder().delay(ms(-1))).toThrow(
				"Invalid delay (-1ms): must be greater than or equal to zero.",
			);
		});

		it("delay", () => {
			const policy = RetryPolicy.builder().delay(ms(42)).build();

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			expect(exponentialBackOff.initialInterval).toBe(42);
			expect(exponentialBackOff.maxAttempts).toBe(3);

			assertExponentialBackOff(exponentialBackOff, {
				initialInterval: 42,
				jitter: 0,
				multiplier: 1.0,
				maxInterval: Number.MAX_SAFE_INTEGER,
				maxAttempts: 3,
			});
		});

		it("jitter preconditions", () => {
			expect(() => RetryPolicy.builder().jitter(ms(-1))).toThrow(
				"Invalid jitter (-1ms): must be greater than or equal to zero.",
			);
		});

		it("jitter", () => {
			const policy = RetryPolicy.builder().jitter(ms(42)).build();

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			hasDefaultMaxAttemptsAndDelay(exponentialBackOff);
			expect(exponentialBackOff.jitter).toBe(42);

			assertExponentialBackOff(exponentialBackOff, {
				initialInterval: 1000,
				jitter: 42,
				multiplier: 1.0,
				maxInterval: Number.MAX_SAFE_INTEGER,
				maxAttempts: 3,
			});
		});

		it("multiplier preconditions", () => {
			const template =
				"Invalid multiplier '%s': must be greater than or equal to 1. " +
				"A multiplier of 1 is equivalent to a fixed delay.";

			expect(() => RetryPolicy.builder().multiplier(-1)).toThrow(
				template.replace("%s", "-1"),
			);
			expect(() => RetryPolicy.builder().multiplier(0)).toThrow(
				template.replace("%s", "0"),
			);
			expect(() => RetryPolicy.builder().multiplier(0.5)).toThrow(
				template.replace("%s", "0.5"),
			);
		});

		it("multiplier", () => {
			const policy = RetryPolicy.builder().multiplier(1.5).build();

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			hasDefaultMaxAttemptsAndDelay(exponentialBackOff);
			expect(exponentialBackOff.multiplier).toBe(1.5);

			assertExponentialBackOff(exponentialBackOff, {
				initialInterval: 1000,
				jitter: 0,
				multiplier: 1.5,
				maxInterval: Number.MAX_SAFE_INTEGER,
				maxAttempts: 3,
			});
		});

		it("max delay preconditions", () => {
			expect(() => RetryPolicy.builder().maxDelay(ms(-1))).toThrow(
				"Invalid maxDelay (-1ms): must be greater than zero.",
			);
		});

		it("max delay", () => {
			const policy = RetryPolicy.builder().maxDelay(ms(42)).build();

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			const exponentialBackOff = backOff as ExponentialBackOff;
			hasDefaultMaxAttemptsAndDelay(exponentialBackOff);
			expect(exponentialBackOff.maxInterval).toBe(42);

			assertExponentialBackOff(exponentialBackOff, {
				initialInterval: 1000,
				jitter: 0,
				multiplier: 1.0,
				maxInterval: 42,
				maxAttempts: 3,
			});
		});

		it("includes", () => {
			const policy = RetryPolicy.builder()
				.includes(FileNotFoundError, TypeError)
				.includes(NumberFormatError, AssertionError)
				.build();

			expect(policy.shouldRetry(new FileNotFoundError())).toBe(true);
			expect(policy.shouldRetry(new TypeError())).toBe(true);
			expect(policy.shouldRetry(new NumberFormatError())).toBe(true);
			expect(policy.shouldRetry(new AssertionError())).toBe(true);

			expect(policy.shouldRetry(new Error())).toBe(false);
			expect(policy.shouldRetry(new FileSystemError("fs"))).toBe(false);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});

		it("includes with subtype matching", () => {
			const policy = RetryPolicy.builder().includes(IOError).build();

			expect(policy.shouldRetry(new FileNotFoundError())).toBe(true);
			expect(policy.shouldRetry(new FileSystemError("fs"))).toBe(true);

			expect(policy.shouldRetry(new Error())).toBe(false);
			expect(policy.shouldRetry(new AssertionError())).toBe(false);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});

		it("excludes", () => {
			const policy = RetryPolicy.builder()
				.excludes(FileNotFoundError, TypeError)
				.excludes(NumberFormatError, AssertionError)
				.build();

			expect(policy.shouldRetry(new FileNotFoundError())).toBe(false);
			expect(policy.shouldRetry(new TypeError())).toBe(false);
			expect(policy.shouldRetry(new NumberFormatError())).toBe(false);
			expect(policy.shouldRetry(new AssertionError())).toBe(false);

			expect(policy.shouldRetry(new Error())).toBe(true);
			expect(policy.shouldRetry(new FileSystemError("fs"))).toBe(true);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});

		it("excludes with subtype matching", () => {
			const policy = RetryPolicy.builder().excludes(IOError).build();

			expect(policy.shouldRetry(new IOError("io"))).toBe(false);
			expect(policy.shouldRetry(new FileNotFoundError())).toBe(false);
			expect(policy.shouldRetry(new FileSystemError("fs"))).toBe(false);

			expect(policy.shouldRetry(new Error())).toBe(true);
			expect(policy.shouldRetry(new AssertionError())).toBe(true);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});

		it("predicate", () => {
			const policy = RetryPolicy.builder()
				.predicate(NumberFormatExceptionMatcher)
				.build();

			expect(policy.shouldRetry(new NumberFormatError())).toBe(true);
			expect(policy.shouldRetry(new CustomNumberFormatError())).toBe(true);

			expect(policy.shouldRetry(new Error())).toBe(false);
			expect(policy.shouldRetry(new SyntaxError())).toBe(false);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});

		it("predicates combined", () => {
			const BOOM = "Boom!";
			const policy = RetryPolicy.builder()
				.predicate(NumberFormatExceptionMatcher)
				.predicate((throwable) => (throwable as Error).message === BOOM)
				.build();

			expect(policy.shouldRetry(new NumberFormatError(BOOM))).toBe(true);
			expect(policy.shouldRetry(new CustomNumberFormatError(BOOM))).toBe(true);

			expect(policy.shouldRetry(new NumberFormatError())).toBe(false);
			expect(policy.shouldRetry(new CustomNumberFormatError())).toBe(false);
			expect(policy.shouldRetry(new Error())).toBe(false);
			expect(policy.shouldRetry(new SyntaxError())).toBe(false);

			const backOff = policy.backOff;
			expect(backOff).toBeInstanceOf(ExponentialBackOff);
			hasDefaultMaxAttemptsAndDelay(backOff as ExponentialBackOff);
		});
	});
});

interface ExponentialBackOffExpectations {
	initialInterval: number;
	jitter: number;
	multiplier: number;
	maxInterval: number;
	maxAttempts: number;
}

function assertExponentialBackOff(
	backOff: ExponentialBackOff,
	expected: ExponentialBackOffExpectations,
): void {
	expect(backOff.initialInterval).toBe(expected.initialInterval);
	expect(backOff.jitter).toBe(expected.jitter);
	expect(backOff.multiplier).toBe(expected.multiplier);
	expect(backOff.maxInterval).toBe(expected.maxInterval);
	expect(backOff.maxAttempts).toBe(expected.maxAttempts);
}

function hasDefaultMaxAttemptsAndDelay(backOff: ExponentialBackOff): void {
	expect(backOff.maxAttempts).toBe(3);
	expect(backOff.initialInterval).toBe(1000);
}

function NumberFormatExceptionMatcher(throwable: unknown): boolean {
	return throwable instanceof NumberFormatError;
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

class FileSystemError extends IOError {
	constructor(message?: string) {
		super(message);
		this.name = "FileSystemError";
	}
}

class NumberFormatError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "NumberFormatError";
	}
}

class CustomNumberFormatError extends NumberFormatError {
	constructor(message?: string) {
		super(message);
		this.name = "CustomNumberFormatError";
	}
}

class AssertionError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "AssertionError";
	}
}
