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
import { StringUtils } from "@nestjs-port/core";
import type { EventFilter } from "./event-filter.js";
import type { SessionEvent } from "./session-event.js";
import type { Session } from "./session.js";
import type { SessionRepository } from "./session-repository.js";

/** Session metadata paired with its event log and a monotonically increasing version. */
class SessionData {
  constructor(
    readonly session: Session,
    readonly events: SessionEvent[],
    readonly version: number,
  ) {}

  withEvents(newEvents: SessionEvent[]): SessionData {
    return new SessionData(this.session, newEvents, this.version + 1);
  }
}

/**
 * In-memory implementation of {@link SessionRepository}. Suitable for development and
 * testing. Not suitable for production use as state is lost on application restart and not
 * shared across instances.
 *
 * Session metadata and event log are stored together in a private {@link SessionData}
 * holder.
 */
export class InMemorySessionRepository implements SessionRepository {
  private readonly _store = new Map<string, SessionData>();

  async save(session: Session): Promise<Session> {
    assert(session != null, "session must not be null");
    const existing = this._store.get(session.id);
    const events = existing != null ? existing.events : [];
    const version = existing != null ? existing.version : 0;
    this._store.set(session.id, new SessionData(session, events, version));
    return session;
  }

  async findById(sessionId: string): Promise<Session | null> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    const data = this._store.get(sessionId);
    return data != null ? data.session : null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    assert(StringUtils.hasText(userId), "userId must not be null or empty");
    return [...this._store.values()]
      .filter((d) => d.session.userId === userId)
      .map((d) => d.session);
  }

  async findExpiredSessionIds(before: Date): Promise<string[]> {
    assert(before != null, "before must not be null");
    return [...this._store.values()]
      .filter(
        (d) => d.session.expiresAt != null && d.session.expiresAt < before,
      )
      .map((d) => d.session.id);
  }

  async delete(sessionId: string): Promise<void> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    this._store.delete(sessionId);
  }

  async appendEvent(event: SessionEvent): Promise<void> {
    assert(event != null, "event must not be null");
    const sessionId = event.sessionId;
    const existing = this._store.get(sessionId);
    if (existing == null) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this._store.set(
      sessionId,
      existing.withEvents([...existing.events, event]),
    );
  }

  replaceEvents(sessionId: string, events: SessionEvent[]): Promise<void>;
  replaceEvents(
    sessionId: string,
    events: SessionEvent[],
    expectedVersion: number,
  ): Promise<boolean>;
  async replaceEvents(
    sessionId: string,
    events: SessionEvent[],
    expectedVersion?: number,
  ): Promise<void | boolean> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(events != null, "events must not be null");
    const existing = this._store.get(sessionId);
    if (existing == null) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (expectedVersion === undefined) {
      this._store.set(sessionId, existing.withEvents([...events]));
      return;
    }
    if (existing.version !== expectedVersion) {
      return false;
    }
    this._store.set(sessionId, existing.withEvents([...events]));
    return true;
  }

  async getEventVersion(sessionId: string): Promise<number> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    const data = this._store.get(sessionId);
    return data != null ? data.version : 0;
  }

  async findEvents(
    sessionId: string,
    filter: EventFilter,
  ): Promise<SessionEvent[]> {
    assert(
      StringUtils.hasText(sessionId),
      "sessionId must not be null or empty",
    );
    assert(filter != null, "filter must not be null");

    const data = this._store.get(sessionId);
    if (data == null) {
      return [];
    }

    let matched = data.events.filter((e) => filter.matches(e));

    if (filter.lastN != null && matched.length > filter.lastN) {
      matched = matched.slice(matched.length - filter.lastN);
    }

    if (filter.pageSize != null) {
      const pageNum = filter.page != null ? filter.page : 0;
      const size = filter.pageSize;
      const fromIdx = pageNum * size;
      if (fromIdx >= matched.length) {
        matched = [];
      } else {
        matched = matched.slice(
          fromIdx,
          Math.min(fromIdx + size, matched.length),
        );
      }
    }

    return [...matched];
  }
}
