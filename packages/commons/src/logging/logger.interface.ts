/**
 * Logger interface similar to SLF4J's Logger.
 *
 * Provides logging methods for different severity levels.
 *
 * @example
 * ```typescript
 * const logger = LoggerFactory.getLogger('MyClass');
 *
 * logger.info('Application started');
 * logger.debug('Processing item: {}', itemId);
 *
 * if (logger.isDebugEnabled()) {
 *   logger.debug('Expensive debug info: {}', computeExpensiveInfo());
 * }
 * ```
 */
export interface Logger {
	/**
	 * The name of this logger instance.
	 */
	readonly name: string;

	/**
	 * Log a message at TRACE level.
	 */
	trace(message: string, ...args: unknown[]): void;

	/**
	 * Log a message at DEBUG level.
	 */
	debug(message: string, ...args: unknown[]): void;

	/**
	 * Log a message at INFO level.
	 */
	info(message: string, ...args: unknown[]): void;

	/**
	 * Log a message at WARN level.
	 */
	warn(message: string, ...args: unknown[]): void;

	/**
	 * Log a message at ERROR level.
	 */
	error(message: string, ...args: unknown[]): void;

	/**
	 * Check if TRACE level is enabled.
	 */
	isTraceEnabled(): boolean;

	/**
	 * Check if DEBUG level is enabled.
	 */
	isDebugEnabled(): boolean;

	/**
	 * Check if INFO level is enabled.
	 */
	isInfoEnabled(): boolean;

	/**
	 * Check if WARN level is enabled.
	 */
	isWarnEnabled(): boolean;

	/**
	 * Check if ERROR level is enabled.
	 */
	isErrorEnabled(): boolean;
}
