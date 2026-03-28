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

import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";

/**
 * Scope of an observation. Corresponds to Micrometer's Observation.Scope.
 * Represents a scope within which an observation is current.
 */
export interface ObservationScope {
  /**
   * Returns the observation associated with this scope.
   */
  readonly currentObservation: Observation<ObservationContext>;

  /**
   * Returns the previous observation scope (for stack-based nesting).
   */
  readonly previousObservationScope: ObservationScope | null;

  /**
   * Closes this scope, restoring the previous scope as current.
   */
  close(): void;
}
