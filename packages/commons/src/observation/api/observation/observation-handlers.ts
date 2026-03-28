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
import type { ObservationHandler } from "./observation-handler.interface";

/**
 * Mutable container for observation handlers.
 */
export class ObservationHandlers {
  private readonly _handlers: ObservationHandler<ObservationContext>[];

  constructor(
    handlers: readonly ObservationHandler<ObservationContext>[] = [],
  ) {
    this._handlers = [...handlers];
  }

  get handlers(): readonly ObservationHandler<ObservationContext>[] {
    return this._handlers;
  }

  addHandler(handler: ObservationHandler<ObservationContext>): void {
    this._handlers.push(handler);
  }

  addHandlers(
    handlers: readonly ObservationHandler<ObservationContext>[],
  ): void {
    this._handlers.push(...handlers);
  }
}
