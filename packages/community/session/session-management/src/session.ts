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

/** Number of milliseconds in 60 days, the default session lifetime. */
const DEFAULT_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Parameters for constructing a {@link Session}.
 *
 * `id` and `userId` are required. `createdAt` defaults to the current instant,
 * `expiresAt` defaults to 60 days from now (pass `null` for no expiry), and `metadata`
 * defaults to an empty record.
 */
export interface SessionProps {
  id: string;
  userId: string;
  createdAt?: Date;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Immutable metadata container for a single, continuous conversation between a user and
 * an agent. Holds only identity and lifecycle fields — the event log is stored separately
 * in `SessionRepository` and retrieved on demand via `SessionService`.
 *
 * Mutations return new instances; the original is never modified.
 */
export class Session {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _createdAt: Date;
  private readonly _expiresAt: Date | null;
  private readonly _metadata: Record<string, unknown>;

  constructor(props: SessionProps) {
    assert(props.id.length > 0, "id must not be null or empty");
    assert(props.userId.length > 0, "userId must not be null or empty");
    this._id = props.id;
    this._userId = props.userId;
    this._createdAt = props.createdAt ?? new Date();
    this._expiresAt =
      props.expiresAt !== undefined
        ? props.expiresAt
        : new Date(Date.now() + DEFAULT_TTL_MS);
    this._metadata = { ...props.metadata };
  }

  /** Unique identifier for this session. */
  get id(): string {
    return this._id;
  }

  /** The actor (user or agent) who owns this session. Critical for isolation. */
  get userId(): string {
    return this._userId;
  }

  /** When this session was created. */
  get createdAt(): Date {
    return this._createdAt;
  }

  /** When this session expires (TTL-based lifecycle). `null` means no expiry. */
  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  /** Arbitrary metadata: model info, tags, agent type, etc. */
  get metadata(): Record<string, unknown> {
    return this._metadata;
  }
}
