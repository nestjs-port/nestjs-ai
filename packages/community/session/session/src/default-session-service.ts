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
import { randomUUID } from "node:crypto";
import { StringUtils } from "@nestjs-port/core";
import { CompactionRequest } from "./compaction/compaction-request.js";
import { CompactionResult } from "./compaction/compaction-result.js";
import type { CompactionStrategy } from "./compaction/compaction-strategy.js";
import type { CompactionTrigger } from "./compaction/compaction-trigger.js";
import type { CreateSessionRequest } from "./create-session-request.js";
import { EventFilter } from "./event-filter.js";
import type { SessionEvent } from "./session-event.js";
import type { SessionRepository } from "./session-repository.js";
import { SessionService } from "./session-service.js";
import { Session } from "./session.js";

/** Number of milliseconds in 60 days, the default session lifetime. */
const DEFAULT_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Default implementation of {@link SessionService} backed by a {@link SessionRepository}.
 */
export class DefaultSessionService extends SessionService {
  private readonly _sessionRepository: SessionRepository;
  private readonly _defaultTimeToLiveMs: number;

  constructor(
    sessionRepository: SessionRepository,
    defaultTimeToLiveMs: number = DEFAULT_TTL_MS,
  ) {
    super();
    assert(sessionRepository != null, "sessionRepository must not be null");
    assert(defaultTimeToLiveMs != null, "defaultTimeToLiveMs must not be null");
    this._sessionRepository = sessionRepository;
    this._defaultTimeToLiveMs = defaultTimeToLiveMs;
  }

  async create(request: CreateSessionRequest): Promise<Session> {
    assert(request != null, "request must not be null");
    const now = new Date();
    const expiresAt =
      request.timeToLive != null
        ? new Date(now.getTime() + request.timeToLive)
        : new Date(now.getTime() + this._defaultTimeToLiveMs);
    const sessionId =
      request.id != null && request.id.trim().length > 0
        ? request.id
        : randomUUID();
    const session = new Session({
      id: sessionId,
      userId: request.userId,
      createdAt: now,
      expiresAt,
      metadata: { ...request.metadata },
    });
    return this._sessionRepository.save(session);
  }

  async findById(sessionId: string): Promise<Session | null> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    return this._sessionRepository.findById(sessionId);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    assert(StringUtils.hasText(userId), "userId must not be null or empty");
    return this._sessionRepository.findByUserId(userId);
  }

  async delete(sessionId: string): Promise<void> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    await this._sessionRepository.delete(sessionId);
  }

  async deleteExpiredSessions(before: Date): Promise<number> {
    assert(before != null, "before must not be null");
    const expired = await this._sessionRepository.findExpiredSessionIds(before);
    for (const sessionId of expired) {
      await this._sessionRepository.delete(sessionId);
    }
    return expired.length;
  }

  async appendEvent(event: SessionEvent): Promise<void> {
    assert(event != null, "event must not be null");
    await this._sessionRepository.appendEvent(event);
  }

  async getEvents(
    sessionId: string,
    filter: EventFilter = EventFilter.all(),
  ): Promise<SessionEvent[]> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(filter != null, "filter must not be null");
    return this._sessionRepository.findEvents(sessionId, filter);
  }

  async compact(
    sessionId: string,
    trigger: CompactionTrigger,
    strategy: CompactionStrategy,
  ): Promise<CompactionResult> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(trigger != null, "trigger must not be null");
    assert(strategy != null, "strategy must not be null");

    const session = await this._sessionRepository.findById(sessionId);
    if (session == null) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return this.compactWith(session, trigger, strategy);
  }

  /**
   * Core compaction logic shared by both `compact` overloads. Skips the `findById`
   * round-trip — the caller must supply a valid {@link Session}.
   */
  private async compactWith(
    session: Session,
    trigger: CompactionTrigger,
    strategy: CompactionStrategy,
  ): Promise<CompactionResult> {
    // Read version BEFORE events so the version we pass to the CAS write is
    // guaranteed to be ≤ the version of the events we subsequently read. If another
    // writer (append or compaction) mutates the log between our read and our write,
    // the CAS will detect the version mismatch and return false — we skip silently,
    // as the concurrent writer already handled the session.
    const version = await this._sessionRepository.getEventVersion(session.id);

    // Operate on the active context window only — already-archived events are retained for
    // Recall Storage and must not be re-processed (or re-summarized) by compaction.
    const events = await this._sessionRepository.findEvents(
      session.id,
      EventFilter.active(),
    );
    const request = CompactionRequest.of(session, events);

    if (!trigger.shouldCompact(request)) {
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    const result = await strategy.compact(request);

    if (result.archivedEvents.length > 0) {
      const replaced = await this._sessionRepository.compactEvents(
        session.id,
        result.archivedEvents,
        result.compactedEvents,
        version,
      );
      if (!replaced) {
        // CAS rejected — a concurrent writer already mutated the log; skip silently.
        return new CompactionResult({
          compactedEvents: events,
          archivedEvents: [],
          tokensEstimatedSaved: 0,
        });
      }
    }

    return result;
  }
}
