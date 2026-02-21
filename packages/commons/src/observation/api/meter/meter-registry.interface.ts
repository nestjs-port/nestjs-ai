import type { Counter } from "./counter";
import type { MeterId } from "./meter-id";

/**
 * Interface for a registry that creates and manages meters.
 * Corresponds to Micrometer's MeterRegistry.
 */
export interface MeterRegistry {
  /**
   * Create or retrieve a counter for the given meter id.
   *
   * @param id - immutable meter identifier
   * @returns the counter
   */
  counter(id: MeterId): Counter;
}
