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

import type {
  Observation,
  ObservationContext,
  ObservationFilter,
  ObservationHandler,
  ObservationScope,
} from "../observation";

/**
 * Registry that manages handlers and current observation scope.
 * Corresponds to Micrometer's ObservationRegistry.
 */
export interface ObservationRegistry {
  /**
   * Returns currently registered handlers.
   */
  readonly handlers: readonly ObservationHandler<ObservationContext>[];
  readonly filters: readonly ObservationFilter[];

  /**
   * Register a handler to receive observation lifecycle callbacks.
   */
  addHandler(handler: ObservationHandler<ObservationContext>): void;

  /**
   * Register a filter to mutate observation context before stop handlers run.
   */
  addFilter(filter: ObservationFilter): void;

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

  /**
   * Runs a callback within an observation context, using the provided initial scope when creating one.
   * Implementations should preserve the context across async boundaries.
   */
  runInScope<T>(initialScope: ObservationScope, fn: () => T): T;
}
