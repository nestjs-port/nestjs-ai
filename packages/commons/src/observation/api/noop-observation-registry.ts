import { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * No-op implementation of ObservationRegistry.
 * Creates observations with no handlers, so lifecycle methods are effectively no-ops.
 */
export class NoopObservationRegistry implements ObservationRegistry {
	static readonly INSTANCE = new NoopObservationRegistry();

	private constructor() {}

	observation<CTX extends ObservationContext>(
		_convention: ObservationConvention<CTX> | null,
		defaultConvention: ObservationConvention<CTX>,
		contextSupplier: () => CTX,
	): Observation<CTX> {
		const context = contextSupplier();
		return new Observation(context, defaultConvention, [], this);
	}

	addHandler(_handler: ObservationHandler<ObservationContext>): void {
		// no-op
	}

	isNoop(): boolean {
		return true;
	}

	getCurrentObservationScope(): ObservationScope | null {
		return null;
	}

	setCurrentObservationScope(_scope: ObservationScope | null): void {
		// no-op
	}

	getCurrentObservation(): Observation<ObservationContext> | null {
		return null;
	}
}
