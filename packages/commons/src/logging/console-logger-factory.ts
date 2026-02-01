import type { Logger } from "./logger.interface";
import type { ILoggerFactory } from "./logger-factory.interface";

/**
 * Simple console-based Logger implementation.
 */
class ConsoleLogger implements Logger {
	constructor(public readonly name: string) {}

	trace(message: string, ...args: unknown[]): void {
		console.trace(`[${this.name}] ${message}`, ...args);
	}

	debug(message: string, ...args: unknown[]): void {
		console.debug(`[${this.name}] ${message}`, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		console.info(`[${this.name}] ${message}`, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		console.warn(`[${this.name}] ${message}`, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		console.error(`[${this.name}] ${message}`, ...args);
	}

	isTraceEnabled(): boolean {
		return true;
	}

	isDebugEnabled(): boolean {
		return true;
	}

	isInfoEnabled(): boolean {
		return true;
	}

	isWarnEnabled(): boolean {
		return true;
	}

	isErrorEnabled(): boolean {
		return true;
	}
}

/**
 * ILoggerFactory implementation that creates console-based loggers.
 * Useful for testing and simple applications.
 */
export class ConsoleLoggerFactory implements ILoggerFactory {
	getLogger(name: string): Logger {
		return new ConsoleLogger(name);
	}
}
