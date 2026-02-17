/**
 * `Ordered` can be implemented by objects that should be orderable, for example in a collection.
 *
 * The actual {@link order} value can be interpreted as prioritization:
 * the first object (with the lowest order value) has the highest priority.
 *
 * Higher values are interpreted as lower priority. Same order values result in
 * arbitrary sort positions for the affected objects.
 *
 * @see HIGHEST_PRECEDENCE
 * @see LOWEST_PRECEDENCE
 */
export interface Ordered {
  /**
   * Get the order value of this object.
   *
   * Higher values are interpreted as lower priority. As a consequence, the object
   * with the lowest value has the highest priority.
   *
   * @returns the order value
   */
  get order(): number;
}

/**
 * Useful constant for the highest precedence value.
 * Equivalent to Java `Integer.MIN_VALUE`.
 */
export const HIGHEST_PRECEDENCE = -2147483648;

/**
 * Useful constant for the lowest precedence value.
 * Equivalent to Java `Integer.MAX_VALUE`.
 */
export const LOWEST_PRECEDENCE = 2147483647;
