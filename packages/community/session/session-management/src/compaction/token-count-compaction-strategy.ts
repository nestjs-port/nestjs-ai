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
 * Parameters for constructing a {@link TokenCountCompactionStrategy}.
 */
export interface TokenCountCompactionStrategyProps {
  maxTokens?: number;
  tokenCountEstimator?: TokenCountEstimator;
}

/**
 * Compaction strategy that retains events within a maximum estimated token budget. Token
 * count is approximated with the help of a {@link TokenCountEstimator}.
 *
 * ## Algorithm
 * 1. Separate synthetic summary events — they are always preserved and placed first in the
 *    result. Their token cost is deducted from the budget before real events are
 *    considered, so a large prior compaction summary reduces the space available for real
 *    events.
 * 2. Walk real events from newest to oldest, accumulating cost until the budget is
 *    exhausted. Stops at the first event that would exceed the remaining budget, producing
 *    a contiguous kept window (a suffix of the real-event list). Skipping oversize events
 *    and continuing would produce non-contiguous gaps that break conversation coherence.
 * 3. Snap the cut point to the next root-level (`branch == null`) user message. This
 *    guarantees the kept window always starts at a turn boundary — sub-agent `USER`
 *    messages are skipped because they are turn-internal, not turn starts.
 * 4. Return: `[synthetic events] + [kept events]`.
 *
 * ## No-op condition
 * If all real events fit within the token budget no events are archived and the session is
 * returned unchanged.
 */
export class TokenCountCompactionStrategy implements CompactionStrategy {
  static readonly DEFAULT_MAX_TOKENS = 4000;

  private readonly _maxTokens: number;
  private readonly _tokenCountEstimator: TokenCountEstimator;

  constructor(props: TokenCountCompactionStrategyProps = {}) {
    const maxTokens =
      props.maxTokens ?? TokenCountCompactionStrategy.DEFAULT_MAX_TOKENS;
    const tokenCountEstimator =
      props.tokenCountEstimator ?? new TiktokenTokenCountEstimator();
    assert(maxTokens > 0, "maxTokens must be greater than 0");
    assert(tokenCountEstimator != null, "tokenCountEstimator must not be null");
    this._maxTokens = maxTokens;
    this._tokenCountEstimator = tokenCountEstimator;
  }

  async compact(context: CompactionRequest): Promise<CompactionResult> {
    assert(context != null, "context must not be null");
    assert(context.session != null, "session must not be null");

    const events = context.events;

    // Always keep synthetic events
    const synthetic = events.filter((e) => e.isSynthetic());
    const real = events.filter((e) => !e.isSynthetic());

    const syntheticTokens = synthetic.reduce(
      (sum, e) =>
        sum +
        this._tokenCountEstimator.estimate(CompactionUtils.formatEvent(e)),
      0,
    );

    const remainingBudget = this._maxTokens - syntheticTokens;

    // Walk from newest to oldest, accumulating events until the budget is reached.
    // Stop at the first event that would exceed the remaining budget so the kept
    // window is always a contiguous suffix — keeping older events after skipping a
    // large middle event would produce gaps that break conversation coherence.
    let rawCutIndex = real.length;
    let usedTokens = 0;
    for (let i = real.length - 1; i >= 0; i--) {
      const tokens = this._tokenCountEstimator.estimate(
        CompactionUtils.formatEvent(real[i]),
      );
      if (usedTokens + tokens <= remainingBudget) {
        usedTokens += tokens;
        rawCutIndex = i;
      } else {
        break;
      }
    }

    // Snap the raw cut forward to the nearest root-level USER event so the kept
    // window always starts at a turn boundary. Sub-agent USER messages (branch != null)
    // are skipped — they are turn-internal, not turn starts.
    const cutIndex = CompactionUtils.snapToTurnStart(real, rawCutIndex);

    // Build kept and archived lists in chronological order
    const kept = real.slice(cutIndex);
    const archived = real.slice(0, cutIndex);

    if (archived.length === 0) {
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    const compacted = [...synthetic, ...kept];

    const tokensRemoved = archived.reduce(
      (sum, e) =>
        sum +
        this._tokenCountEstimator.estimate(CompactionUtils.formatEvent(e)),
      0,
    );

    return new CompactionResult({
      compactedEvents: compacted,
      archivedEvents: archived,
      tokensEstimatedSaved: tokensRemoved,
    });
  }

  get maxTokens(): number {
    return this._maxTokens;
  }
}
