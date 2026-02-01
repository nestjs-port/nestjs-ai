import type { Logger } from "./logger.interface";
import type { ILoggerFactory } from "./logger-factory.interface";

/**
 * The LoggerFactory is a utility class producing Loggers for various logging APIs.
 *
 * This class is similar to SLF4J's LoggerFactory. It serves as a static facade
 * that delegates to the bound ILoggerFactory implementation.
 *
 * @example
 * ```typescript
 * // At application startup, bind the logger factory
 * import { LoggerFactory } from '@nestjs-ai/commons/logging';
 * import { NestLoggerFactory } from '@nestjs-ai/core';
 *
 * LoggerFactory.bind(new NestLoggerFactory());
 *
 * // Then use it anywhere in the application
 * const logger = LoggerFactory.getLogger('MyClass');
 * logger.info('Hello, world!');
 * ```
 */
export class LoggerFactory {
	private static factory: ILoggerFactory | null = null;

	/**
	 * Private constructor to prevent instantiation.
	 */
	private constructor() {}

	/**
	 * Bind an ILoggerFactory implementation to this LoggerFactory.
	 *
	 * This method should be called once at application startup before
	 * any logging calls are made.
	 *
	 * @param factory - The ILoggerFactory implementation to bind
	 */
	static bind(factory: ILoggerFactory): void {
		LoggerFactory.factory = factory;
	}

	/**
	 * Return a logger named according to the name parameter.
	 *
	 * @param name - The name of the logger
	 * @returns A Logger instance
	 * @throws Error if no ILoggerFactory has been bound
	 */
	static getLogger(name: string): Logger {
		if (!LoggerFactory.factory) {
			throw new Error(
				"LoggerFactory not bound. Call LoggerFactory.bind() with an ILoggerFactory implementation first.",
			);
		}
		return LoggerFactory.factory.getLogger(name);
	}
}
