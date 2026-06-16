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

import type { EventFilter } from "./event-filter.js";
import type { SessionEvent } from "./session-event.js";
import type { Session } from "./session.js";

/**
 * Persistence contract for {@link Session} objects and their event logs.
 *
 * Implementations must be thread-safe. Events are stored separately from session metadata
 * and are mutated via dedicated methods to keep session metadata immutable.
 */
export interface SessionRepository {
  // Sessions

  /**
   * Persists session metadata (create or update). If the session already exists its event
   * log is preserved.
   * @returns the saved session
   */
  save(session: Session): Promise<Session>;

  findById(sessionId: string): Promise<Session | null>;

  findByUserId(userId: string): Promise<Session[]>;

  /** Returns the IDs of all sessions whose TTL has expired before the given instant. */
  findExpiredSessionIds(before: Date): Promise<string[]>;

  /** Deletes the session with the given ID. */
  delete(sessionId: string): Promise<void>;

  // Events

  /**
   * Appends a single event to the session's event log. The target session is identified by
   * {@link SessionEvent.sessionId}. Also updates `lastActiveAt` on the session.
   * @throws if the session does not exist
   */
  appendEvent(event: SessionEvent): Promise<void>;

  /**
   * Replaces the entire event log for the given session with the provided list. Used after
   * compaction to atomically swap the event list.
   * @throws if the session does not exist
   */
  replaceEvents(sessionId: string, events: SessionEvent[]): Promise<void>;

  /**
   * Compare-and-swap variant of {@link replaceEvents}: atomically replaces the event log
   * only if the current event-log version equals `expectedVersion`. Returns `true` when the
   * swap succeeded, `false` when another writer had already mutated the event log (a
   * concurrent compaction or append) between the caller's read and this write.
   *
   * Callers should read {@link getEventVersion} _before_ reading events via
   * {@link findEvents}, then pass that version here. If this method returns `false` the
   * caller should treat the compaction as a no-op — the concurrent writer already handled
   * the session.
   * @throws if the session does not exist
   */
  replaceEvents(
    sessionId: string,
    events: SessionEvent[],
    expectedVersion: number,
  ): Promise<boolean>;

  /**
   * Returns the current event-log version for the given session. The version is incremented
   * atomically on every {@link appendEvent} and {@link replaceEvents} call. Returns `0` when
   * the session does not exist or has no events yet.
   *
   * Read this _before_ calling {@link findEvents} to obtain a version that is guaranteed to
   * be ≤ the version of the events you subsequently read, which is the safe ordering for
   * passing to {@link replaceEvents}.
   */
  getEventVersion(sessionId: string): Promise<number>;

  /**
   * Returns events for the given session that match the provided filter. If
   * {@link EventFilter.lastN} is set, only the most recent N matching events are returned.
   * Events are always returned in chronological order (oldest first).
   *
   * **Existence contract:** returns an empty list when the session does not exist, rather
   * than throwing. This differs from {@link appendEvent} and {@link replaceEvents}, which
   * throw for unknown sessions. The silent-empty behaviour allows callers to query event
   * history without first checking whether the session exists (the "read before write"
   * pattern used by `SessionMemoryAdvisor`).
   */
  findEvents(sessionId: string, filter: EventFilter): Promise<SessionEvent[]>;
}
