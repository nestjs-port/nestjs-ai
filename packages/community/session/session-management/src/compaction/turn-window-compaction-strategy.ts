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
import { MessageType } from "@nestjs-ai/model";
import assert from "node:assert/strict";
import type { CompactionRequest } from "./compaction-request.js";
import { CompactionResult } from "./compaction-result.js";
import type { CompactionStrategy } from "./compaction-strategy.js";
import { CompactionUtils } from "./compaction-utils.js";
import type { SessionEvent } from "../session-event.js";

/**
 * Parameters for constructing a {@link TurnWindowCompactionStrategy}.
 */
export interface TurnWindowCompactionStrategyProps {
  maxTurns?: number;
  tokenCountEstimator?: TokenCountEstimator;
}

/**
 * Compaction strategy that retains only the last `maxTurns` complete _turns_, discarding
 * older ones.
 *
 * ## What is a turn?
 * A turn begins with a {@link MessageType.USER} message and ends just before the next user
 * message. It includes every event the agent produced in response: assistant messages,
 * tool calls, tool results, and any additional assistant follow-ups. A turn is the atomic
 * unit of a conversation.
 *
 * ## Algorithm
 * 1. Strip out synthetic summary events — they are always placed first in the result.
 * 2. Collect any events that appear before the first user message (rare, but possible for
 *    pre-seeded tool state) — these are preserved as preamble.
 * 3. Group the remaining events into turns (each turn starts at a user message).
 * 4. If the turn count is within `maxTurns`, return unchanged.
 * 5. Archive the oldest turns until only `maxTurns` remain.
 * 6. Return: `[synthetic summaries] + [preamble] + [kept turns]`.
 *
 * ## No-op condition
 * If the session has fewer turns than `maxTurns`, no events are removed.
 */
export class TurnWindowCompactionStrategy implements CompactionStrategy {
  /** Default number of complete turns preserved after compaction. */
  static readonly DEFAULT_MAX_TURNS = 10;

  private readonly _maxTurns: number;
  private readonly _tokenCountEstimator: TokenCountEstimator;

  constructor(props: TurnWindowCompactionStrategyProps = {}) {
    const maxTurns =
      props.maxTurns ?? TurnWindowCompactionStrategy.DEFAULT_MAX_TURNS;
    const tokenCountEstimator =
      props.tokenCountEstimator ?? new TiktokenTokenCountEstimator();
    assert(maxTurns > 0, "maxTurns must be greater than 0");
    assert(tokenCountEstimator != null, "tokenCountEstimator must not be null");
    this._maxTurns = maxTurns;
    this._tokenCountEstimator = tokenCountEstimator;
  }

  async compact(request: CompactionRequest): Promise<CompactionResult> {
    assert(request != null, "request must not be null");

    const events = request.events;

    // 1. Separate synthetic summary events — always preserved, always first
    const synthetic = events.filter((e) => e.isSynthetic());
    const real = events.filter((e) => !e.isSynthetic());

    // 2. Collect any preamble events that appear before the first user message
    // (e.g., pre-seeded tool context). These are kept verbatim.
    const preamble: SessionEvent[] = [];
    let firstUserIdx = 0;
    while (
      firstUserIdx < real.length &&
      !(
        real[firstUserIdx].isRootEvent() &&
        real[firstUserIdx].messageType === MessageType.USER
      )
    ) {
      preamble.push(real[firstUserIdx]);
      firstUserIdx++;
    }
    const afterPreamble = real.slice(firstUserIdx);

    // 3. Group into turns — each turn starts at a root-level user message
    const turns = TurnWindowCompactionStrategy.groupIntoTurns(afterPreamble);

    // 4. No-op if within budget
    if (turns.length <= this._maxTurns) {
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    // 5. Archive oldest turns
    const toArchiveCount = turns.length - this._maxTurns;
    const archivedTurns = turns.slice(0, toArchiveCount);
    const keptTurns = turns.slice(toArchiveCount);

    const archived = archivedTurns.flat();
    const kept = keptTurns.flat();

    // 6. Assemble result: [synthetics] + [preamble] + [kept turns]
    const compacted = [...synthetic, ...preamble, ...kept];

    const tokensArchived = archived.reduce(
      (sum, e) =>
        sum +
        this._tokenCountEstimator.estimate(CompactionUtils.formatEvent(e)),
      0,
    );

    return new CompactionResult({
      compactedEvents: compacted,
      archivedEvents: archived,
      tokensEstimatedSaved: tokensArchived,
    });
  }

  /**
   * Groups a flat list of events into turns. Each turn starts with a root-level
   * (`branch == null`) {@link MessageType.USER} event. Sub-agent branch events are grouped
   * with the enclosing root turn. Assumes `events` begins with a root user message
   * (preamble has already been stripped).
   */
  private static groupIntoTurns(events: SessionEvent[]): SessionEvent[][] {
    const turns: SessionEvent[][] = [];
    let currentTurn: SessionEvent[] | null = null;

    for (const event of events) {
      if (event.isRootEvent() && event.messageType === MessageType.USER) {
        if (currentTurn != null) {
          turns.push(currentTurn);
        }
        currentTurn = [];
      }
      if (currentTurn != null) {
        currentTurn.push(event);
      }
    }
    if (currentTurn != null && currentTurn.length > 0) {
      turns.push(currentTurn);
    }
    return turns;
  }

  get maxTurns(): number {
    return this._maxTurns;
  }
}
