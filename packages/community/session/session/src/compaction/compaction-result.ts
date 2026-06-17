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
import type { SessionEvent } from "../session-event.js";

/**
 * Parameters for constructing a {@link CompactionResult}.
 */
export interface CompactionResultProps {
  compactedEvents: SessionEvent[];
  archivedEvents: SessionEvent[];
  tokensEstimatedSaved: number;
}

/**
 * The outcome of a compaction operation.
 */
export class CompactionResult {
  private readonly _compactedEvents: SessionEvent[];
  private readonly _archivedEvents: SessionEvent[];
  private readonly _tokensEstimatedSaved: number;

  constructor(props: CompactionResultProps) {
    assert(props.compactedEvents != null, "compactedEvents must not be null");
    assert(props.archivedEvents != null, "archivedEvents must not be null");
    this._compactedEvents = [...props.compactedEvents];
    this._archivedEvents = [...props.archivedEvents];
    this._tokensEstimatedSaved = props.tokensEstimatedSaved;
  }

  get compactedEvents(): SessionEvent[] {
    return this._compactedEvents;
  }

  get archivedEvents(): SessionEvent[] {
    return this._archivedEvents;
  }

  get tokensEstimatedSaved(): number {
    return this._tokensEstimatedSaved;
  }

  /** Returns the number of events removed, derived from {@link archivedEvents}. */
  eventsRemoved(): number {
    return this._archivedEvents.length;
  }
}
