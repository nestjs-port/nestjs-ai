import { AsyncLocalStorage } from "node:async_hooks";
import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Observation registry backed by AsyncLocalStorage.
 */
export class AlsObservationRegistry implements ObservationRegistry {
  private readonly _handlers: ObservationHandler<ObservationContext>[] = [];
  private readonly scopeStorage =
    new AsyncLocalStorage<ObservationScope | null>();

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
    return this.scopeStorage.getStore() ?? null;
  }

  set currentObservationScope(scope: ObservationScope | null) {
    this.scopeStorage.enterWith(scope);
  }

  get currentObservation(): Observation<ObservationContext> | null {
    const scope = this.currentObservationScope;
    return scope?.currentObservation ?? null;
  }

  runInScope<T>(scope: ObservationScope | null, fn: () => T): T {
    return this.scopeStorage.run(scope, fn);
  }
}
