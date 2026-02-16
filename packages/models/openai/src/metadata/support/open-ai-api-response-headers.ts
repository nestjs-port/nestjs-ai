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
