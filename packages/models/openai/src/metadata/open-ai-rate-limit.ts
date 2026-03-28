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

import type { Milliseconds } from "@nestjs-ai/commons";
import type { RateLimit } from "@nestjs-ai/model";

/**
 * RateLimit implementation for OpenAI.
 *
 * @see {@link https://platform.openai.com/docs/guides/rate-limits/rate-limits-in-headers Rate limits in headers}
 */
export class OpenAiRateLimit implements RateLimit {
  constructor(
    readonly requestsLimit: number,
    readonly requestsRemaining: number,
    readonly requestsReset: Milliseconds,
    readonly tokensLimit: number,
    readonly tokensRemaining: number,
    readonly tokensReset: Milliseconds,
  ) {}

  [Symbol.toPrimitive](): string {
    return `{ @type: ${this.constructor.name}, requestsLimit: ${this.requestsLimit}, requestsRemaining: ${this.requestsRemaining}, requestsReset: ${this.requestsReset}, tokensLimit: ${this.tokensLimit}, tokensRemaining: ${this.tokensRemaining}, tokensReset: ${this.tokensReset} }`;
  }
}
