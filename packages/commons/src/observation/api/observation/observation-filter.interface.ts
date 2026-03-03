import type { ObservationContext } from "./observation-context";

/**
 * Allows mutating the observation context before handlers process it on stop.
 * Corresponds to Micrometer's ObservationFilter.
 */
export interface ObservationFilter {
  /**
   * Mutates the observation context.
   */
  map(context: ObservationContext): ObservationContext;
}
