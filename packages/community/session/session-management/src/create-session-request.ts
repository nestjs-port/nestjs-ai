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

/**
 * Parameters for creating a new `Session`.
 */
export class CreateSessionRequest {
  private readonly _id: string | null;
  private readonly _userId: string;
  private readonly _timeToLive: number | null;
  private readonly _metadata: Record<string, unknown>;

  constructor(builder: CreateSessionRequestBuilder) {
    assert(builder.userIdValue.length > 0, "userId must not be null or empty");
    this._id = builder.idValue;
    this._userId = builder.userIdValue;
    this._timeToLive = builder.timeToLiveValue;
    this._metadata = { ...builder.metadataValue };
  }

  /** Returns the requested session ID, or `null` if the service should generate one. */
  get id(): string | null {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  /** Time-to-live in milliseconds, or `null` for no expiry. */
  get timeToLive(): number | null {
    return this._timeToLive;
  }

  get metadata(): Record<string, unknown> {
    return this._metadata;
  }

  static builder(): CreateSessionRequestBuilder {
    return new CreateSessionRequestBuilder();
  }
}

export class CreateSessionRequestBuilder {
  private _idValue: string | null = null;
  private _userIdValue = "";
  private _timeToLiveValue: number | null = null;
  private _metadataValue: Record<string, unknown> = {};

  get idValue(): string | null {
    return this._idValue;
  }

  get userIdValue(): string {
    return this._userIdValue;
  }

  get timeToLiveValue(): number | null {
    return this._timeToLiveValue;
  }

  get metadataValue(): Record<string, unknown> {
    return this._metadataValue;
  }

  /** Sets an explicit session ID. If omitted, the service generates a UUID. */
  id(id: string | null): this {
    this._idValue = id;
    return this;
  }

  userId(userId: string): this {
    this._userIdValue = userId;
    return this;
  }

  /** Time-to-live in milliseconds, or `null` for no expiry. */
  timeToLive(timeToLive: number | null): this {
    this._timeToLiveValue = timeToLive;
    return this;
  }

  /** Merges the given entries into the metadata map. */
  metadata(metadata: Record<string, unknown>): this;
  /** Adds a single metadata entry. */
  metadata(key: string, value: unknown): this;
  metadata(
    metadataOrKey: Record<string, unknown> | string,
    value?: unknown,
  ): this {
    if (typeof metadataOrKey === "string") {
      this._metadataValue[metadataOrKey] = value;
    } else {
      this._metadataValue = { ...this._metadataValue, ...metadataOrKey };
    }
    return this;
  }

  build(): CreateSessionRequest {
    return new CreateSessionRequest(this);
  }
}
