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
import { MessageType } from "@nestjs-ai/model";
import type { SessionEvent } from "../session-event.js";
import type { Session } from "../session.js";

/**
 * Parameters for constructing a {@link CompactionRequest}.
 */
export interface CompactionRequestProps {
  /** The session being evaluated for compaction. */
  session: Session;
  /** The session's current list of events, ordered from oldest to newest. */
  events: SessionEvent[];
  /** Total number of events in the session. */
  currentEventCount: number;
  /**
   * Total number of turns in the session (a turn is a user message plus all subsequent
   * events up to the next user message).
   */
  currentTurnCount: number;
}

/**
 * Contextual information provided to {@link CompactionTrigger} and
 * {@link CompactionStrategy} when evaluating whether compaction is needed.
 */
export class CompactionRequest {
  private readonly _session: Session;
  private readonly _events: SessionEvent[];
  private readonly _currentEventCount: number;
  private readonly _currentTurnCount: number;

  constructor(props: CompactionRequestProps) {
    this._session = props.session;
    this._events = props.events;
    this._currentEventCount = props.currentEventCount;
    this._currentTurnCount = props.currentTurnCount;
  }

  /** The session being evaluated for compaction. */
  get session(): Session {
    return this._session;
  }

  /** The session's current list of events, ordered from oldest to newest. */
  get events(): SessionEvent[] {
    return this._events;
  }

  /** Total number of events in the session. */
  get currentEventCount(): number {
    return this._currentEventCount;
  }

  /**
   * Total number of turns in the session (a turn is a user message plus all subsequent
   * events up to the next user message).
   */
  get currentTurnCount(): number {
    return this._currentTurnCount;
  }

  /**
   * Creates a {@link CompactionRequest} from the given session and its event list.
   */
  static of(session: Session, events: SessionEvent[]): CompactionRequest {
    assert(session != null, "session must not be null");
    assert(events != null, "events must not be null");
    const eventCount = events.length;
    // Count only non-synthetic, root-level (branch == null) USER messages.
    // Sub-agents in multi-agent sessions write USER messages attributed to their own
    // branch; counting those would inflate the turn count and cause premature
    // compaction of the root conversation.
    const turnCount = events.filter(
      (e) =>
        !e.isSynthetic() &&
        e.messageType === MessageType.USER &&
        e.isRootEvent(),
    ).length;
    return new CompactionRequest({
      session,
      events,
      currentEventCount: eventCount,
      currentTurnCount: turnCount,
    });
  }
}
