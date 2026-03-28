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

import type { KeyValues } from "../key-values";
import type { ObservationContext } from "./observation-context";

/**
 * Convention that defines how to extract observation metadata from a context.
 * Corresponds to Micrometer's ObservationConvention.
 */
export interface ObservationConvention<CTX extends ObservationContext> {
  /**
   * Returns the technical name of the observation (used as metric/span name).
   */
  getName(): string;

  /**
   * Returns a contextual name for the observation (e.g., "chat gpt-4o").
   */
  getContextualName(context: CTX): string;

  /**
   * Type guard to check if this convention supports the given context.
   */
  supportsContext(context: ObservationContext): context is CTX;

  /**
   * Returns low-cardinality key-value pairs (used for metrics dimensions).
   */
  getLowCardinalityKeyValues(context: CTX): KeyValues;

  /**
   * Returns high-cardinality key-value pairs (used for tracing attributes).
   */
  getHighCardinalityKeyValues(context: CTX): KeyValues;
}
