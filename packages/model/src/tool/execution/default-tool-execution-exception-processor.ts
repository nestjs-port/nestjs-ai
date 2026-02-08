import assert from "node:assert/strict";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { ToolExecutionException } from "./tool-execution-exception";
import type { ToolExecutionExceptionProcessor } from "./tool-execution-exception-processor.interface";

/**
 * Default implementation of {@link ToolExecutionExceptionProcessor}. Can be configured
 * with an allowlist of exceptions that will be unwrapped from the
 * {@link ToolExecutionException} and rethrown as is.
 */
export class DefaultToolExecutionExceptionProcessor
	implements ToolExecutionExceptionProcessor
{
	private readonly logger: Logger = LoggerFactory.getLogger(
		DefaultToolExecutionExceptionProcessor.name,
	);

	private readonly _alwaysThrow: boolean;
	private readonly _rethrownExceptions: readonly (new (
		...args: never[]
	) => Error)[];

	constructor(alwaysThrow: boolean);
	constructor(
		alwaysThrow: boolean,
		rethrownExceptions: (new (...args: never[]) => Error)[],
	);
	constructor(
		alwaysThrow: boolean,
		rethrownExceptions?: (new (...args: never[]) => Error)[],
	) {
		this._alwaysThrow = alwaysThrow;
		this._rethrownExceptions = rethrownExceptions ?? [];
	}

	process(exception: ToolExecutionException): string {
		assert(exception, "exception cannot be null");
		const cause = exception.cause;
		if (cause instanceof Error) {
			const matchesClass = this._rethrownExceptions.some(
				(ErrorClass) => cause instanceof ErrorClass,
			);
			const matchesName = this._rethrownExceptions
				.map((e) => e.name)
				.includes(cause.name);

			if (matchesClass || matchesName) {
				throw cause;
			}
		} else {
			throw exception;
		}

		if (this._alwaysThrow) {
			throw exception;
		}
		let message = exception.message;
		if (!message || message.trim() === "") {
			const causeName = cause?.constructor?.name;
			message = `Exception occurred in tool: ${exception.toolDefinition.name} (${causeName})`;
		}
		this.logger.debug(
			`Exception thrown by tool: ${exception.toolDefinition.name}. Message: ${message}`,
			exception,
		);
		return message;
	}
}
