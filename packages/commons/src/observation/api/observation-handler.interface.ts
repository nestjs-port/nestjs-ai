import type { ObservationContext } from "./observation-context";

/**
 * Handler that receives observation lifecycle callbacks.
 * Corresponds to Micrometer's ObservationHandler.
 */
export interface ObservationHandler<CTX extends ObservationContext> {
	/**
	 * Type guard to check if this handler supports the given context.
	 */
	supportsContext(context: ObservationContext): context is CTX;

	/**
	 * Called when the observation is started.
	 */
	onStart?(context: CTX): void;

	/**
	 * Called when a scope is opened for the observation.
	 */
	onScopeOpened?(context: CTX): void;

	/**
	 * Called when a scope is closed for the observation.
	 */
	onScopeClosed?(context: CTX): void;

	/**
	 * Called when an error occurs during the observation.
	 */
	onError?(context: CTX): void;

	/**
	 * Called when the observation is stopped.
	 */
	onStop?(context: CTX): void;
}
