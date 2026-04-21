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
import { type Milliseconds, ms } from "@nestjs-port/core";
import {
  EmptyRateLimit,
  type RateLimit,
  TextToSpeechResponseMetadata,
} from "@nestjs-ai/model";

import { OpenAiRateLimit } from "./open-ai-rate-limit";

export class OpenAiAudioSpeechResponseMetadata extends TextToSpeechResponseMetadata {
  static readonly NULL = new OpenAiAudioSpeechResponseMetadata();

  protected static readonly AI_METADATA_STRING =
    "{ @type: %1$s, rateLimit: %2$s }";

  private static readonly REQUESTS_LIMIT_HEADER = "x-ratelimit-limit-requests";

  private static readonly REQUESTS_REMAINING_HEADER =
    "x-ratelimit-remaining-requests";

  private static readonly REQUESTS_RESET_HEADER = "x-ratelimit-reset-requests";

  private static readonly TOKENS_LIMIT_HEADER = "x-ratelimit-limit-tokens";

  private static readonly TOKENS_REMAINING_HEADER =
    "x-ratelimit-remaining-tokens";

  private static readonly TOKENS_RESET_HEADER = "x-ratelimit-reset-tokens";

  private readonly _rateLimit: RateLimit;

  constructor(rateLimit: RateLimit | null = null) {
    super();
    this._rateLimit = rateLimit ?? new EmptyRateLimit();
  }

  static from(
    headers: Headers | null | undefined,
  ): OpenAiAudioSpeechResponseMetadata {
    assert(headers != null, "Headers must not be null");

    const requestsLimit = this.getHeaderAsLong(
      headers,
      this.REQUESTS_LIMIT_HEADER,
    );
    const requestsRemaining = this.getHeaderAsLong(
      headers,
      this.REQUESTS_REMAINING_HEADER,
    );
    const requestsReset = this.getHeaderAsDuration(
      headers,
      this.REQUESTS_RESET_HEADER,
    );

    const tokensLimit = this.getHeaderAsLong(headers, this.TOKENS_LIMIT_HEADER);
    const tokensRemaining = this.getHeaderAsLong(
      headers,
      this.TOKENS_REMAINING_HEADER,
    );
    const tokensReset = this.getHeaderAsDuration(
      headers,
      this.TOKENS_RESET_HEADER,
    );

    const rateLimit =
      requestsLimit != null || tokensLimit != null
        ? new OpenAiRateLimit(
            requestsLimit,
            requestsRemaining,
            requestsReset,
            tokensLimit,
            tokensRemaining,
            tokensReset,
          )
        : new EmptyRateLimit();

    return new OpenAiAudioSpeechResponseMetadata(rateLimit);
  }

  private static getHeaderAsLong(
    headers: Headers,
    headerName: string,
  ): number | null {
    const value = headers.get(headerName);
    if (value == null || value.trim().length === 0) {
      return null;
    }

    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private static getHeaderAsDuration(
    headers: Headers,
    headerName: string,
  ): Milliseconds | null {
    const value = headers.get(headerName);
    if (value == null || value.trim().length === 0) {
      return null;
    }

    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : ms(parsed * 1000);
  }

  get rateLimit(): RateLimit {
    return this._rateLimit;
  }

  override toString(): string {
    return OpenAiAudioSpeechResponseMetadata.AI_METADATA_STRING.replace(
      "%1$s",
      this.constructor.name,
    ).replace("%2$s", String(this.rateLimit));
  }
}
