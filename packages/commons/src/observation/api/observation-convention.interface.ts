import type { KeyValue } from "./key-value";
import type { ObservationContext } from "./observation-context";

/**
 * Convention that defines how to extract observation metadata from a context.
 * Corresponds to Micrometer's ObservationConvention.
 */
export interface ObservationConvention<CTX extends ObservationContext> {
  /**
   * Returns the technical name of the observation (used as metric/span name).
   */
  getName(): string;

  /**
   * Returns a contextual name for the observation (e.g., "chat gpt-4o").
   */
  getContextualName(context: CTX): string;

  /**
   * Type guard to check if this convention supports the given context.
   */
  supportsContext(context: ObservationContext): context is CTX;

  /**
   * Returns low-cardinality key-value pairs (used for metrics dimensions).
   */
  getLowCardinalityKeyValues(context: CTX): KeyValue[];

  /**
   * Returns high-cardinality key-value pairs (used for tracing attributes).
   */
  getHighCardinalityKeyValues(context: CTX): KeyValue[];
}
