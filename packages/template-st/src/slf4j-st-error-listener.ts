import type { Logger } from "@nestjs-ai/commons";
import {
	ErrorType,
	type STErrorListener,
	type STMessage,
} from "stringtemplate4ts";

/**
 * An error listener that delegates to a Logger.
 */
export class Slf4jStErrorListener implements STErrorListener {
	private readonly _logger: Logger;

	/**
	 * Creates a new Slf4jStErrorListener with the specified logger.
	 * @param logger - the logger to delegate to
	 */
	constructor(logger: Logger) {
		this._logger = logger;
	}

	/**
	 * Handles compile-time errors.
	 * @param msg - the error message
	 */
	compileTimeError(msg: STMessage): void {
		this._logger.error(msg.toString());
	}

	/**
	 * Handles runtime errors.
	 * If the error is NO_SUCH_PROPERTY, it logs as a warning; otherwise as an error.
	 * @param msg - the error message
	 */
	runTimeError(msg: STMessage): void {
		if (msg.error === ErrorType.NO_SUCH_PROPERTY) {
			this._logger.warn(msg.toString());
		} else {
			this._logger.error(msg.toString());
		}
	}

	/**
	 * Handles IO errors.
	 * @param msg - the error message
	 */
	iOError(msg: STMessage): void {
		this._logger.error(msg.toString());
	}

	/**
	 * Handles internal errors.
	 * @param msg - the error message
	 */
	internalError(msg: STMessage): void {
		this._logger.error(msg.toString());
	}
}
