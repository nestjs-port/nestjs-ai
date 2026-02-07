import { describe, expect, it } from "vitest";
import { DefaultToolDefinition } from "../../definition";
import { DefaultToolExecutionExceptionProcessor } from "../default-tool-execution-exception-processor";
import { ToolExecutionException } from "../tool-execution-exception";

/**
 * Custom error class for testing rethrow functionality.
 */
class CustomError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomError";
	}
}

/**
 * Another custom error class for testing selective rethrow.
 */
class AnotherCustomError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AnotherCustomError";
	}
}

/**
 * Unit tests for {@link DefaultToolExecutionExceptionProcessor}.
 */
describe("DefaultToolExecutionExceptionProcessor", () => {
	const toolException = new CustomError("Inner exception");

	const toolDefinition = new DefaultToolDefinition(
		"toolName",
		"toolDescription",
		"inputSchema",
	);

	const toolExecutionException = new ToolExecutionException(
		toolDefinition,
		toolException,
	);

	it("process returns message", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false);

		const result = processor.process(toolExecutionException);

		expect(result).toBe(toolException.message);
	});

	it("process returns fallback message when null", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false);

		const errorWithNoMessage = new CustomError("");
		delete (errorWithNoMessage as unknown as Record<string, unknown>).message;
		const exception = new ToolExecutionException(
			toolDefinition,
			errorWithNoMessage,
		);

		const result = processor.process(exception);

		expect(result).toBe("Exception occurred in tool: toolName (CustomError)");
	});

	it("process returns fallback message when blank", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false);

		const exception = new ToolExecutionException(
			toolDefinition,
			new Error(" "),
		);

		const result = processor.process(exception);

		expect(result).toBe("Exception occurred in tool: toolName (Error)");
	});

	it("process always throws when alwaysThrow is true", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(true);

		expect(() => processor.process(toolExecutionException)).toThrow(
			ToolExecutionException,
		);
		expect(() => processor.process(toolExecutionException)).toThrow(
			toolException.message,
		);
	});

	it("process rethrows when exception class matches", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false, [
			CustomError,
		]);

		expect(() => processor.process(toolExecutionException)).toThrow(
			toolException,
		);
	});

	it("process rethrows exception subclasses", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false, [
			Error,
		]);

		expect(() => processor.process(toolExecutionException)).toThrow(
			toolException,
		);
	});

	it("process rethrows only select exceptions", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false, [
			AnotherCustomError,
		]);

		const exception = new ToolExecutionException(
			toolDefinition,
			new CustomError("This exception was not rethrown"),
		);

		const result = processor.process(exception);

		expect(result).toBe("This exception was not rethrown");
	});

	it("process throws when cause is not an Error", () => {
		const processor = new DefaultToolExecutionExceptionProcessor(false);

		// Create exception with non-Error cause
		const nonErrorCause = "string cause" as unknown as Error;
		const exception = new ToolExecutionException(toolDefinition, nonErrorCause);

		expect(() => processor.process(exception)).toThrow(ToolExecutionException);
	});
});
