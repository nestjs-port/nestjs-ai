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
import type { Milliseconds } from "@nestjs-port/core";

export interface CachedContentUpdateRequestProps {
  ttl?: Milliseconds;
  expireTime?: Date;
}

export class CachedContentUpdateRequest {
  private readonly _ttl?: Milliseconds;
  private readonly _expireTime?: Date;

  constructor(props: CachedContentUpdateRequestProps) {
    assert(
      props.ttl !== undefined || props.expireTime !== undefined,
      "Either TTL or expire time must be set for update",
    );

    this._ttl = props.ttl;
    this._expireTime = props.expireTime;
  }

  get ttl(): Milliseconds | undefined {
    return this._ttl;
  }

  get expireTime(): Date | undefined {
    return this._expireTime;
  }
}
