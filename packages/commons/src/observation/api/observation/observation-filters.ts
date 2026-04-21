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

import type { Ordered } from "@nestjs-port/core";
import type { ObservationFilter } from "./observation-filter.interface";

/**
 * Mutable container for observation filters.
 */
export class ObservationFilters {
  private readonly _filters: ObservationFilter[];

  constructor(filters: readonly ObservationFilter[] = []) {
    this._filters = [...filters];
  }

  get filters(): readonly ObservationFilter[] {
    return this._filters;
  }

  get orderedFilters(): readonly ObservationFilter[] {
    return [...this._filters].sort((left, right) => {
      const leftOrder = isOrdered(left) ? left.order : 0;
      const rightOrder = isOrdered(right) ? right.order : 0;
      return leftOrder - rightOrder;
    });
  }

  addFilter(filter: ObservationFilter): void {
    this._filters.push(filter);
  }

  addFilters(filters: readonly ObservationFilter[]): void {
    this._filters.push(...filters);
  }
}

function isOrdered(value: unknown): value is Ordered {
  return (
    value != null &&
    typeof value === "object" &&
    "order" in value &&
    typeof (value as Ordered).order === "number"
  );
}
