import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Registry that manages handlers and current observation scope.
 * Corresponds to Micrometer's ObservationRegistry.
 */
export interface ObservationRegistry {
	/**
	 * Returns currently registered handlers.
	 */
	readonly handlers: readonly ObservationHandler<ObservationContext>[];

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
	get currentObservationScope(): ObservationScope | null;

	/**
	 * Sets the current observation scope.
	 */
	set currentObservationScope(scope: ObservationScope | null);

	/**
	 * Returns the current observation from the current scope, or null if none.
	 */
	readonly currentObservation: Observation<ObservationContext> | null;
}
