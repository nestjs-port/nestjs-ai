/**
 * Utility methods for string operations.
 */
export abstract class StringUtils {
  private constructor() {
    // Utility class
  }

  /**
   * Check whether the given value is a string with at least one non-whitespace
   * character.
   */
  static hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
