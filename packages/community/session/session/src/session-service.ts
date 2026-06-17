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

import type { Message } from "@nestjs-ai/model";
import type { CompactionResult } from "./compaction/compaction-result.js";
import type { CompactionStrategy } from "./compaction/compaction-strategy.js";
import type { CompactionTrigger } from "./compaction/compaction-trigger.js";
import type { CreateSessionRequest } from "./create-session-request.js";
import type { EventFilter } from "./event-filter.js";
import { SessionEvent } from "./session-event.js";
import type { Session } from "./session.js";

/**
 * Primary API for managing the full lifecycle of {@link Session} objects.
 */
export abstract class SessionService {
  // Sessions

  abstract create(request: CreateSessionRequest): Promise<Session>;

  abstract findById(sessionId: string): Promise<Session | null>;

  abstract findByUserId(userId: string): Promise<Session[]>;

  abstract delete(sessionId: string): Promise<void>;

  /**
   * Deletes all sessions whose `expiresAt` is before `before`. Delegates to
   * {@link SessionRepository.findExpiredSessionIds} then deletes each one. Returns the
   * number of sessions deleted.
   *
   * This method does not schedule itself — call it from a scheduled task, a cron job, or
   * any other scheduler:
   * ```ts
   * // every hour
   * setInterval(() => {
   *   void sessionService.deleteExpiredSessions(new Date());
   * }, 3_600_000);
   * ```
   */
  abstract deleteExpiredSessions(before: Date): Promise<number>;

  // Events

  /**
   * Appends a {@link SessionEvent} to the session identified by
   * {@link SessionEvent.sessionId}.
   */
  abstract appendEvent(event: SessionEvent): Promise<void>;

  /**
   * Returns events matching the given filter, in chronological order. When no filter is
   * provided, returns all events for the session, in chronological order.
   */
  abstract getEvents(
    sessionId: string,
    filter?: EventFilter,
  ): Promise<SessionEvent[]>;

  /**
   * Convenience shorthand: wraps the message in a {@link SessionEvent} and appends it.
   */
  appendMessage(sessionId: string, message: Message): Promise<void> {
    return this.appendEvent(new SessionEvent({ sessionId, message }));
  }

  /**
   * Convenience: returns all events as a flat {@link Message} list, suitable for passing
   * directly to an LLM.
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const events = await this.getEvents(sessionId);
    return events.map((event) => event.message);
  }

  // Compaction

  /**
   * Evaluates the trigger and, if it fires, compacts the session's event history using the
   * given strategy. Fetches the event list once, builds a {@link CompactionRequest}, checks
   * the trigger, and — only if the trigger fires — runs the strategy and writes the
   * compacted list back to the repository. No-ops (trigger does not fire, or strategy
   * archives nothing) skip the repository write entirely.
   *
   * Pass `() => true` as the trigger to compact unconditionally.
   * @returns the compaction result; {@link CompactionResult.archivedEvents} is empty when
   * the trigger did not fire or when the strategy archived nothing
   */
  abstract compact(
    sessionId: string,
    trigger: CompactionTrigger,
    strategy: CompactionStrategy,
  ): Promise<CompactionResult>;
}
