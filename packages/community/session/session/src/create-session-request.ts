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

import type { Milliseconds } from "@nestjs-port/core";
import assert from "node:assert/strict";

/**
 * Parameters for constructing a {@link CreateSessionRequest}.
 *
 * `userId` is required. `id` defaults to `null` (the service generates a UUID),
 * `timeToLive` defaults to `null` (no expiry), and `metadata` defaults to an empty record.
 */
export interface CreateSessionRequestProps {
  /** An explicit session ID. If omitted or `null`, the service generates a UUID. */
  id?: string | null;
  userId: string;
  /** Time-to-live in milliseconds, or `null` for no expiry. */
  timeToLive?: Milliseconds | null;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for creating a new `Session`.
 */
export class CreateSessionRequest {
  private readonly _id: string | null;
  private readonly _userId: string;
  private readonly _timeToLive: Milliseconds | null;
  private readonly _metadata: Record<string, unknown>;

  constructor(props: CreateSessionRequestProps) {
    assert(props.userId.length > 0, "userId must not be null or empty");
    this._id = props.id ?? null;
    this._userId = props.userId;
    this._timeToLive = props.timeToLive ?? null;
    this._metadata = { ...props.metadata };
  }

  /** Returns the requested session ID, or `null` if the service should generate one. */
  get id(): string | null {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  /** Time-to-live in milliseconds, or `null` for no expiry. */
  get timeToLive(): Milliseconds | null {
    return this._timeToLive;
  }

  get metadata(): Record<string, unknown> {
    return this._metadata;
  }
}
