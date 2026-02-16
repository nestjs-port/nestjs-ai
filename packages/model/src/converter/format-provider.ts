/**
 * Implementations of this interface provides instructions for how the output of a
 * language generative should be formatted.
 */
export interface FormatProvider {
  /**
   * Get the format of the output of a language generative.
   * @return Returns a string containing instructions for how the output of a language
   * generative should be formatted.
   */
  get format(): string;
}
