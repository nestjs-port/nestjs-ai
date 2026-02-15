import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Registry that creates observations and manages handlers.
 * Corresponds to Micrometer's ObservationRegistry.
 */
export interface ObservationRegistry {
	/**
	 * Create an observation with optional custom convention override.
	 *
	 * @param convention - Custom convention to override default (null to use default)
	 * @param defaultConvention - Default convention to use
	 * @param contextSupplier - Factory function to create the context
	 * @returns An Observation wrapping the context
	 */
	observation<CTX extends ObservationContext>(
		convention: ObservationConvention<CTX> | null,
		defaultConvention: ObservationConvention<CTX>,
		contextSupplier: () => CTX,
	): Observation<CTX>;

	/**
	 * Register a handler to receive observation lifecycle callbacks.
	 */
	addHandler(handler: ObservationHandler<ObservationContext>): void;

	/**
	 * Whether this registry is a no-op implementation.
	 */
	isNoop(): boolean;

	/**
	 * Returns the current observation scope, or null if none is active.
	 */
	getCurrentObservationScope(): ObservationScope | null;

	/**
	 * Sets the current observation scope.
	 */
	setCurrentObservationScope(scope: ObservationScope | null): void;

	/**
	 * Returns the current observation from the current scope, or null if none.
	 */
	getCurrentObservation(): Observation<ObservationContext> | null;
}
