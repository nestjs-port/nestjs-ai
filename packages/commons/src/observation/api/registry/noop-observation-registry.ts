import type {
  Observation,
  ObservationContext,
  ObservationHandler,
  ObservationScope,
} from "../observation";
import type { ObservationRegistry } from "./observation-registry.interface";

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

  runInScope<T>(_initialScope: ObservationScope, fn: () => T): T {
    return fn();
  }
}
