import { Logger as NestLogger } from "@nestjs/common";
import type { ILoggerFactory, Logger } from "@nestjs-ai/commons";

/**
 * NestJS Logger adapter implementing the Logger interface.
 */
class NestLoggerAdapter implements Logger {
	private readonly nestLogger: NestLogger;

	constructor(public readonly name: string) {
		this.nestLogger = new NestLogger(name);
	}

	trace(message: string, ...args: unknown[]): void {
		this.nestLogger.verbose(message, args);
	}

	debug(message: string, ...args: unknown[]): void {
		this.nestLogger.debug(message, args);
	}

	info(message: string, ...args: unknown[]): void {
		this.nestLogger.log(message, args);
	}

	warn(message: string, ...args: unknown[]): void {
		this.nestLogger.warn(message, args);
	}

	error(message: string, ...args: unknown[]): void {
		this.nestLogger.error(message, args);
	}

	isTraceEnabled(): boolean {
		return NestLogger.isLevelEnabled("verbose");
	}

	isDebugEnabled(): boolean {
		return NestLogger.isLevelEnabled("debug");
	}

	isInfoEnabled(): boolean {
		return NestLogger.isLevelEnabled("log");
	}

	isWarnEnabled(): boolean {
		return NestLogger.isLevelEnabled("warn");
	}

	isErrorEnabled(): boolean {
		return NestLogger.isLevelEnabled("error");
	}
}

/**
 * ILoggerFactory implementation that creates loggers backed by NestJS Logger.
 *
 * @example
 * ```typescript
 * import { LoggerFactory } from '@nestjs-ai/commons/logging';
 * import { NestLoggerFactory } from '@nestjs-ai/core';
 *
 * // At application bootstrap
 * LoggerFactory.bind(new NestLoggerFactory());
 * ```
 */
export class NestLoggerFactory implements ILoggerFactory {
	getLogger(name: string): Logger {
		return new NestLoggerAdapter(name);
	}
}
