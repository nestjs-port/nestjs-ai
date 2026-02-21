import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";

/**
 * Scope of an observation. Corresponds to Micrometer's Observation.Scope.
 * Represents a scope within which an observation is current.
 */
export interface ObservationScope {
  /**
   * Returns the observation associated with this scope.
   */
  readonly currentObservation: Observation<ObservationContext>;

  /**
   * Returns the previous observation scope (for stack-based nesting).
   */
  readonly previousObservationScope: ObservationScope | null;

  /**
   * Closes this scope, restoring the previous scope as current.
   */
  close(): void;
}
