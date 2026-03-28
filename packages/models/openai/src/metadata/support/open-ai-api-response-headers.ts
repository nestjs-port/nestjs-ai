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

/**
 * Enumeration of OpenAI API response headers.
 */
export enum OpenAiApiResponseHeaders {
  REQUESTS_LIMIT_HEADER = "x-ratelimit-limit-requests",
  REQUESTS_REMAINING_HEADER = "x-ratelimit-remaining-requests",
  REQUESTS_RESET_HEADER = "x-ratelimit-reset-requests",
  TOKENS_RESET_HEADER = "x-ratelimit-reset-tokens",
  TOKENS_LIMIT_HEADER = "x-ratelimit-limit-tokens",
  TOKENS_REMAINING_HEADER = "x-ratelimit-remaining-tokens",
}

/**
 * Metadata for OpenAI API response headers.
 */
export const OpenAiApiResponseHeadersMetadata: Record<
  OpenAiApiResponseHeaders,
  { name: string; description: string }
> = {
  [OpenAiApiResponseHeaders.REQUESTS_LIMIT_HEADER]: {
    name: "x-ratelimit-limit-requests",
    description: "Total number of requests allowed within timeframe.",
  },
  [OpenAiApiResponseHeaders.REQUESTS_REMAINING_HEADER]: {
    name: "x-ratelimit-remaining-requests",
    description: "Remaining number of requests available in timeframe.",
  },
  [OpenAiApiResponseHeaders.REQUESTS_RESET_HEADER]: {
    name: "x-ratelimit-reset-requests",
    description: "Duration of time until the number of requests reset.",
  },
  [OpenAiApiResponseHeaders.TOKENS_RESET_HEADER]: {
    name: "x-ratelimit-reset-tokens",
    description: "Total number of tokens allowed within timeframe.",
  },
  [OpenAiApiResponseHeaders.TOKENS_LIMIT_HEADER]: {
    name: "x-ratelimit-limit-tokens",
    description: "Remaining number of tokens available in timeframe.",
  },
  [OpenAiApiResponseHeaders.TOKENS_REMAINING_HEADER]: {
    name: "x-ratelimit-remaining-tokens",
    description: "Duration of time until the number of tokens reset.",
  },
};
