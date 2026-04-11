/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type {
  Observation,
  ObservationContext,
  ObservationFilter,
  ObservationHandler,
  ObservationScope,
} from "../observation";
import type { ObservationRegistry } from "./observation-registry.interface";

/**
 * Observation registry backed by AsyncLocalStorage.
 */
export class AlsObservationRegistry implements ObservationRegistry {
  private readonly _handlers: ObservationHandler<ObservationContext>[] = [];
  private readonly _filters: ObservationFilter[] = [];
  private readonly scopeStorage = new AsyncLocalStorage<{
    scope: ObservationScope | null;
  }>();

  get handlers(): readonly ObservationHandler<ObservationContext>[] {
    return this._handlers;
  }

  get filters(): readonly ObservationFilter[] {
    return this._filters;
  }

  addHandler(handler: ObservationHandler<ObservationContext>): void {
    this._handlers.push(handler);
  }

  addFilter(filter: ObservationFilter): void {
    this._filters.push(filter);
  }

  isNoop(): boolean {
    return false;
  }

  get currentObservationScope(): ObservationScope | null {
    return this.scopeStorage.getStore()?.scope ?? null;
  }

  setCurrentObservationScope(scope: ObservationScope | null): void {
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
