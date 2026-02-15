import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Simple implementation of ObservationScope that manages a stack of scopes.
 * Corresponds to Micrometer's SimpleObservation.SimpleScope.
 *
 * On construction, saves the previous scope and sets itself as current.
 * On close, notifies handlers and restores the previous scope.
 */
export class SimpleObservationScope implements ObservationScope {
	private readonly _observation: Observation<ObservationContext>;
	private readonly _registry: ObservationRegistry;
	private readonly _previousObservationScope: ObservationScope | null;

	constructor(
		registry: ObservationRegistry,
		observation: Observation<ObservationContext>,
	) {
		this._observation = observation;
		this._registry = registry;
		this._previousObservationScope = registry.getCurrentObservationScope();
		registry.setCurrentObservationScope(this);
	}

	getCurrentObservation(): Observation<ObservationContext> {
		return this._observation;
	}

	getPreviousObservationScope(): ObservationScope | null {
		return this._previousObservationScope;
	}

	close(): void {
		this._observation.notifyOnScopeClosed();
		this._registry.setCurrentObservationScope(this._previousObservationScope);
	}
}
