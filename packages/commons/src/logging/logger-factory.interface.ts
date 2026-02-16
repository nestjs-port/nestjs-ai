import type { Logger } from "./logger.interface";

/**
 * Factory interface for creating Logger instances.
 *
 * Implementations of this interface are responsible for creating
 * Logger instances bound to specific logging frameworks.
 *
 * @example
 * ```typescript
 * class NestLoggerFactory implements ILoggerFactory {
 *   getLogger(name: string): Logger {
 *     return new NestLoggerAdapter(name);
 *   }
 * }
 * ```
 */
export interface ILoggerFactory {
  /**
   * Return a logger named according to the name parameter.
   *
   * @param name - The name of the logger
   * @returns A Logger instance
   */
  getLogger(name: string): Logger;
}
