import { AsyncLocalStorage } from "node:async_hooks";
import type {
  Observation,
  ObservationContext,
  ObservationHandler,
  ObservationScope,
} from "../observation";
import type { ObservationRegistry } from "./observation-registry.interface";

/**
 * Observation registry backed by AsyncLocalStorage.
 */
export class AlsObservationRegistry implements ObservationRegistry {
  private readonly _handlers: ObservationHandler<ObservationContext>[] = [];
  private readonly scopeStorage = new AsyncLocalStorage<{
    scope: ObservationScope | null;
  }>();

  get handlers(): readonly ObservationHandler<ObservationContext>[] {
    return this._handlers;
  }

  addHandler(handler: ObservationHandler<ObservationContext>): void {
    this._handlers.push(handler);
  }

  isNoop(): boolean {
    return false;
  }

  get currentObservationScope(): ObservationScope | null {
    return this.scopeStorage.getStore()?.scope ?? null;
  }

  set currentObservationScope(scope: ObservationScope | null) {
    const store = this.scopeStorage.getStore();
    if (!store) {
      return;
    }
    store.scope = scope;
  }

  get currentObservation(): Observation<ObservationContext> | null {
    const scope = this.currentObservationScope;
    return scope?.currentObservation ?? null;
  }

  runInScope<T>(initialScope: ObservationScope, fn: () => T): T {
    if (this.currentObservationScope != null) {
      return fn();
    }
    return this.scopeStorage.run({ scope: initialScope }, fn);
  }
}
