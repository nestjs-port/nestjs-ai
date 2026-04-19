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

import type { CacheControlEphemeral } from "@anthropic-ai/sdk/resources/messages";

/**
 * Anthropic cache TTL (time-to-live) options for specifying how long cached prompts
 * remain valid. Wraps the SDK's TTL values.
 *
 * @see {@link https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching#1-hour-cache-duration Anthropic Prompt Caching}
 */
export enum AnthropicCacheTtl {
  FIVE_MINUTES = "FIVE_MINUTES",
  ONE_HOUR = "ONE_HOUR",
}

export type AnthropicCacheTtlSdkValue = NonNullable<
  CacheControlEphemeral["ttl"]
>;

export function toSdkCacheTtl(
  ttl: AnthropicCacheTtl,
): AnthropicCacheTtlSdkValue {
  switch (ttl) {
    case AnthropicCacheTtl.FIVE_MINUTES:
      return "5m";
    case AnthropicCacheTtl.ONE_HOUR:
      return "1h";
  }
}
