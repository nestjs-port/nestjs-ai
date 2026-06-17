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

import assert from "node:assert/strict";
import type { CompactionRequest } from "./compaction-request.js";
import type { CompactionTrigger } from "./compaction-trigger.js";

/**
 * A {@link CompactionTrigger} that fires when _any_ of its composed triggers fires (OR
 * semantics).
 */
export class CompositeCompactionTrigger implements CompactionTrigger {
  private readonly _triggers: CompactionTrigger[];

  private constructor(triggers: CompactionTrigger[]) {
    assert(triggers.length > 0, "triggers must not be empty");
    this._triggers = [...triggers];
  }

  /**
   * Creates a composite trigger that fires if any of the given triggers fires.
   */
  static anyOf(...triggers: CompactionTrigger[]): CompositeCompactionTrigger {
    assert(triggers.length > 0, "triggers must not be empty");
    return new CompositeCompactionTrigger(triggers);
  }

  shouldCompact(request: CompactionRequest): boolean {
    return this._triggers.some((t) => t.shouldCompact(request));
  }
}
