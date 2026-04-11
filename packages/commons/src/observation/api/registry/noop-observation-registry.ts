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

  get filters(): readonly ObservationFilter[] {
    return [];
  }

  addHandler(_handler: ObservationHandler<ObservationContext>): void {
    // no-op
  }

  addFilter(_filter: ObservationFilter): void {
    // no-op
  }

  isNoop(): boolean {
    return true;
  }

  get currentObservationScope(): ObservationScope | null {
    return null;
  }

  setCurrentObservationScope(_scope: ObservationScope | null): void {
    // no-op
  }

  get currentObservation(): Observation<ObservationContext> | null {
    return null;
  }

  runInScope<T>(_initialScope: ObservationScope, fn: () => T): T {
    return fn();
  }
}
