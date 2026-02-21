import type { Tag } from "./tag";

/**
 * Interface for a registry that creates and manages meters.
 * Corresponds to Micrometer's MeterRegistry.
 */
export interface MeterRegistry {
  /**
   * Create or retrieve a counter with the given name, tags, and optional description.
   *
   * @param name - the metric name
   * @param tags - the tags to associate with the counter
   * @param description - optional description of the counter
   * @returns the counter
   */
  counter(name: string, tags: Tag[], description?: string): Counter;
}

/**
 * A counter metric that can be incremented.
 * Corresponds to Micrometer's Counter.
 */
export interface Counter {
  /**
   * Increment the counter by the given amount.
   *
   * @param amount - the amount to increment
   */
  increment(amount: number): void;
}
