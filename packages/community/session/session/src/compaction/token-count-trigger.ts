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

import type { TokenCountEstimator } from "@nestjs-ai/commons";
import assert from "node:assert/strict";
import type { CompactionRequest } from "./compaction-request.js";
import type { CompactionTrigger } from "./compaction-trigger.js";

/**
 * Parameters for constructing a {@link TokenCountTrigger}.
 */
export interface TokenCountTriggerProps {
  /** Minimum total token count that triggers compaction. Must be positive. */
  threshold: number;
  /** Estimator used to measure each event's token cost. Must not be null. */
  tokenCountEstimator: TokenCountEstimator;
}

/**
 * Triggers compaction when the estimated token count of the session's events reaches a
 * threshold. Token count is measured using a configurable {@link TokenCountEstimator} —
 * the same estimator used by {@link TokenCountCompactionStrategy} — so that the trigger
 * threshold and the strategy budget are expressed in the same units and can be calibrated
 * against each other.
 */
export class TokenCountTrigger implements CompactionTrigger {
  private readonly _threshold: number;
  private readonly _tokenCountEstimator: TokenCountEstimator;

  constructor(props: TokenCountTriggerProps) {
    const threshold = props.threshold;
    const tokenCountEstimator = props.tokenCountEstimator;
    assert(threshold > 0, "threshold must be greater than 0");
    assert(tokenCountEstimator != null, "tokenCountEstimator must not be null");
    this._threshold = threshold;
    this._tokenCountEstimator = tokenCountEstimator;
  }

  shouldCompact(request: CompactionRequest): boolean {
    const totalTokens = request.events
      .map((e) => e.message.text)
      .filter((t) => t != null)
      .reduce((sum, t) => sum + this._tokenCountEstimator.estimate(t), 0);
    return totalTokens >= this._threshold;
  }

  get threshold(): number {
    return this._threshold;
  }
}
