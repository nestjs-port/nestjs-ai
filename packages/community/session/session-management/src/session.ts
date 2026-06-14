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

  constructor(builder: SessionBuilder) {
    assert(builder.idValue.length > 0, "id must not be null or empty");
    assert(builder.userIdValue.length > 0, "userId must not be null or empty");
    this._id = builder.idValue;
    this._userId = builder.userIdValue;
    this._createdAt = builder.createdAtValue;
    this._expiresAt = builder.expiresAtValue;
    this._metadata = { ...builder.metadataValue };
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

  static builder(): SessionBuilder {
    return new SessionBuilder();
  }
}

export class SessionBuilder {
  private _idValue = "";
  private _userIdValue = "";
  private _createdAtValue: Date = new Date();
  private _expiresAtValue: Date | null = new Date(Date.now() + DEFAULT_TTL_MS);
  private _metadataValue: Record<string, unknown> = {};

  get idValue(): string {
    return this._idValue;
  }

  get userIdValue(): string {
    return this._userIdValue;
  }

  get createdAtValue(): Date {
    return this._createdAtValue;
  }

  get expiresAtValue(): Date | null {
    return this._expiresAtValue;
  }

  get metadataValue(): Record<string, unknown> {
    return this._metadataValue;
  }

  id(id: string): this {
    this._idValue = id;
    return this;
  }

  userId(userId: string): this {
    this._userIdValue = userId;
    return this;
  }

  createdAt(createdAt: Date): this {
    this._createdAtValue = createdAt;
    return this;
  }

  expiresAt(expiresAt: Date | null): this {
    this._expiresAtValue = expiresAt;
    return this;
  }

  metadata(metadata: Record<string, unknown>): this {
    this._metadataValue = { ...metadata };
    return this;
  }

  build(): Session {
    return new Session(this);
  }
}
