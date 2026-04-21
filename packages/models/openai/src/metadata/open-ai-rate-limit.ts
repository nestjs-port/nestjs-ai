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
import { ms } from "@nestjs-port/core";
import type { RateLimit } from "@nestjs-ai/model";

/**
 * Rate limit metadata implementation for the OpenAI SDK.
 *
 * @see https://developers.openai.com/api/docs/guides/rate-limits/#rate-limits-in-headers
 */
export class OpenAiRateLimit implements RateLimit {
  private readonly _requestsLimit: number | null;

  private readonly _requestsRemaining: number | null;

  private readonly _tokensLimit: number | null;

  private readonly _tokensRemaining: number | null;

  private readonly _requestsReset: Milliseconds | null;

  private readonly _tokensReset: Milliseconds | null;

  constructor(
    requestsLimit: number | null = null,
    requestsRemaining: number | null = null,
    requestsReset: Milliseconds | null = null,
    tokensLimit: number | null = null,
    tokensRemaining: number | null = null,
    tokensReset: Milliseconds | null = null,
  ) {
    this._requestsLimit = requestsLimit;
    this._requestsRemaining = requestsRemaining;
    this._requestsReset = requestsReset;
    this._tokensLimit = tokensLimit;
    this._tokensRemaining = tokensRemaining;
    this._tokensReset = tokensReset;
  }

  get requestsLimit(): number {
    return this._requestsLimit ?? 0;
  }

  get requestsRemaining(): number {
    return this._requestsRemaining ?? 0;
  }

  get requestsReset(): Milliseconds {
    return this._requestsReset ?? ms(0);
  }

  get tokensLimit(): number {
    return this._tokensLimit ?? 0;
  }

  get tokensRemaining(): number {
    return this._tokensRemaining ?? 0;
  }

  get tokensReset(): Milliseconds {
    return this._tokensReset ?? ms(0);
  }
}
