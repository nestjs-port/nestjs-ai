import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * No-op implementation of ObservationRegistry.
 */
export class NoopObservationRegistry implements ObservationRegistry {
  static readonly INSTANCE = new NoopObservationRegistry();

  private constructor() {}

  get handlers(): readonly ObservationHandler<ObservationContext>[] {
    return [];
  }

  addHandler(_handler: ObservationHandler<ObservationContext>): void {
    // no-op
  }

  isNoop(): boolean {
    return true;
  }

  get currentObservationScope(): ObservationScope | null {
    return null;
  }

  set currentObservationScope(_scope: ObservationScope | null) {
    // no-op
  }

  get currentObservation(): Observation<ObservationContext> | null {
    return null;
  }

  runInScope<T>(_scope: ObservationScope | null, fn: () => T): T {
    return fn();
  }
}
