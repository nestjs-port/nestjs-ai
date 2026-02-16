/**
 * Root of the hierarchy of Model access exceptions that are considered non-transient -
 * where a retry of the same operation would fail unless the cause of the Exception is
 * corrected.
 */
export class NonTransientAiException extends Error {
  /**
   * Constructor with message.
   * @param message the exception message
   */
  constructor(message: string);

  /**
   * Constructor with message and cause.
   * @param message the exception message
   * @param cause the exception cause
   */
  constructor(message: string, cause: Error | undefined);

  constructor(message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = "NonTransientAiException";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NonTransientAiException);
    }
  }
}
