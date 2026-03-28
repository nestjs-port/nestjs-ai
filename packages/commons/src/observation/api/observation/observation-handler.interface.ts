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

import type { ObservationContext } from "./observation-context";

/**
 * Handler that receives observation lifecycle callbacks.
 * Corresponds to Micrometer's ObservationHandler.
 */
export interface ObservationHandler<CTX extends ObservationContext> {
  /**
   * Type guard to check if this handler supports the given context.
   */
  supportsContext(context: ObservationContext): context is CTX;

  /**
   * Called when the observation is started.
   */
  onStart?(context: CTX): void;

  /**
   * Called when a scope is opened for the observation.
   */
  onScopeOpened?(context: CTX): void;

  /**
   * Called when a scope is closed for the observation.
   */
  onScopeClosed?(context: CTX): void;

  /**
   * Called when an error occurs during the observation.
   */
  onError?(context: CTX): void;

  /**
   * Wraps the observed callback so handlers can propagate their own execution context.
   */
  runInScope?<T>(context: CTX, fn: () => Promise<T>): Promise<T>;

  /**
   * Called when the observation is stopped.
   */
  onStop?(context: CTX): void;
}
