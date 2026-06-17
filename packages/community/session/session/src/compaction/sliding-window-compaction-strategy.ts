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

import {
  TiktokenTokenCountEstimator,
  type TokenCountEstimator,
} from "@nestjs-ai/commons";
import assert from "node:assert/strict";
import type { CompactionRequest } from "./compaction-request.js";
import { CompactionResult } from "./compaction-result.js";
import type { CompactionStrategy } from "./compaction-strategy.js";
import { CompactionUtils } from "./compaction-utils.js";

/**
 * Parameters for constructing a {@link SlidingWindowCompactionStrategy}.
 */
export interface SlidingWindowCompactionStrategyProps {
  maxEvents?: number;
  tokenCountEstimator?: TokenCountEstimator;
}

/**
 * Compaction strategy that retains only the last `maxEvents` real events, always cutting
 * on a turn boundary to preserve conversation semantics.
 *
 * ## Algorithm
 * 1. Separate synthetic summary events — they are always preserved and placed first in the
 *    result.
 * 2. Compute a raw cut index based on root (non-branch) real events only. Branch events
 *    produced by sub-agents do not consume slots from the `maxEvents` budget — they are
 *    always included with their enclosing root turn.
 * 3. Snap the raw cut index forward to the nearest root-level {@link MessageType.USER}
 *    event so the kept window always starts at a turn boundary. Sub-agent USER messages
 *    are skipped because they are turn-internal, not turn starts.
 * 4. Return: `[synthetic summaries] + [kept real events]`.
 *
 * ## No-op condition
 * If the number of real events does not exceed the available slots no events are archived
 * and the session is returned unchanged.
 */
export class SlidingWindowCompactionStrategy implements CompactionStrategy {
  static readonly DEFAULT_MAX_EVENTS = 20;

  private readonly _maxEvents: number;
  private readonly _tokenCountEstimator: TokenCountEstimator;

  constructor(props: SlidingWindowCompactionStrategyProps = {}) {
    const maxEvents =
      props.maxEvents ?? SlidingWindowCompactionStrategy.DEFAULT_MAX_EVENTS;
    const tokenCountEstimator =
      props.tokenCountEstimator ?? new TiktokenTokenCountEstimator();
    assert(maxEvents > 0, "maxEvents must be greater than 0");
    assert(tokenCountEstimator != null, "tokenCountEstimator must not be null");
    this._maxEvents = maxEvents;
    this._tokenCountEstimator = tokenCountEstimator;
  }

  get maxEvents(): number {
    return this._maxEvents;
  }

  async compact(context: CompactionRequest): Promise<CompactionResult> {
    assert(context != null, "context must not be null");
    assert(context.session != null, "session must not be null");

    const events = context.events;

    // Separate synthetic summary events (always preserved, always first)
    const synthetic = events.filter((e) => e.isSynthetic());
    const real = events.filter((e) => !e.isSynthetic());

    // maxEvents controls the real-events window only; synthetic summary events are
    // always preserved on top and do not consume slots from the real-event budget.
    // Branch events produced inside sub-agent sessions also do not consume slots —
    // they are always included with their enclosing root turn.
    const slotsForReal = this._maxEvents;

    // Count only root (non-branch) real events to determine whether compaction is needed
    // and where to place the raw cut. Branch events tagged with a non-null branch are
    // turn-internal and are always carried along with their enclosing root turn.
    const rootEventCount = real.filter((e) => e.isRootEvent()).length;

    // No-op if root events fit within the available slots
    if (rootEventCount <= slotsForReal) {
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    // Find the index in 'real' just after the last root event to archive.
    // Walk forward counting root events; place the raw cut right after the
    // (rootEventCount - slotsForReal)-th root event so snapToTurnStart can advance
    // it to the next root-level USER event.
    const rootEventsToArchive = rootEventCount - slotsForReal;
    let rawCutIndex = 0;
    let rootSeen = 0;
    for (let i = 0; i < real.length; i++) {
      if (real[i].isRootEvent()) {
        rootSeen++;
        if (rootSeen === rootEventsToArchive) {
          rawCutIndex = i + 1;
          break;
        }
      }
    }

    // Snap forward to the nearest turn start (USER message) so we never keep a
    // partial turn — e.g. an assistant reply without its originating user message.
    const cutIndex = CompactionUtils.snapToTurnStart(real, rawCutIndex);

    const keptReal = real.slice(cutIndex);
    const removedReal = real.slice(0, cutIndex);

    const compacted = [...synthetic, ...keptReal];

    const tokensRemoved = removedReal.reduce(
      (sum, e) =>
        sum +
        this._tokenCountEstimator.estimate(CompactionUtils.formatEvent(e)),
      0,
    );

    return new CompactionResult({
      compactedEvents: compacted,
      archivedEvents: removedReal,
      tokensEstimatedSaved: tokensRemoved,
    });
  }
}
