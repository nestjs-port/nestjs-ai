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

import type { ObservationRegistry } from "../registry";
import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
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
    this._previousObservationScope = registry.currentObservationScope;
    registry.setCurrentObservationScope(this);
  }

  get currentObservation(): Observation<ObservationContext> {
    return this._observation;
  }

  get previousObservationScope(): ObservationScope | null {
    return this._previousObservationScope;
  }

  close(): void {
    this._observation.notifyOnScopeClosed();
    this._registry.setCurrentObservationScope(this._previousObservationScope);
  }
}
