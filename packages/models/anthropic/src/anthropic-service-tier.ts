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

import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";

/**
 * Service tier for controlling capacity routing on Anthropic API requests.
 *
 * @see {@link https://docs.claude.com/en/api/service-tiers Anthropic Service Tiers}
 */
export enum AnthropicServiceTier {
  /**
   * Use priority capacity if available, otherwise fall back to standard capacity.
   */
  AUTO = "AUTO",

  /**
   * Always use standard capacity.
   */
  STANDARD_ONLY = "STANDARD_ONLY",
}

export function toSdkServiceTier(
  tier: AnthropicServiceTier,
): NonNullable<MessageCreateParams["service_tier"]> {
  switch (tier) {
    case AnthropicServiceTier.AUTO:
      return "auto";
    case AnthropicServiceTier.STANDARD_ONLY:
      return "standard_only";
  }
}
