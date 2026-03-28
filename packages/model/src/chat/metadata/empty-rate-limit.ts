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
import { ms } from "@nestjs-ai/commons";
import type { RateLimit } from "./rate-limit";

/**
 * A RateLimit implementation that returns zero for all property getters.
 */
export class EmptyRateLimit implements RateLimit {
  get requestsLimit(): number {
    return 0;
  }

  get requestsRemaining(): number {
    return 0;
  }

  get requestsReset(): Milliseconds {
    return ms(0);
  }

  get tokensLimit(): number {
    return 0;
  }

  get tokensRemaining(): number {
    return 0;
  }

  get tokensReset(): Milliseconds {
    return ms(0);
  }
}
