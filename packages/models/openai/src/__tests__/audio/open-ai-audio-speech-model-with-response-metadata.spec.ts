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

import { ms } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

import { OpenAiAudioSpeechResponseMetadata } from "../../metadata/index.js";

describe("OpenAiAudioSpeechModelWithResponseMetadataTests", () => {
  it("metadata extracts rate limit headers correctly", () => {
    // Mock headers with rate limit information
    const mockHeaders = new Headers();

    // Set up header values matching the REST implementation test
    mockHeaders.set("x-ratelimit-limit-requests", "4000");
    mockHeaders.set("x-ratelimit-remaining-requests", "999");
    mockHeaders.set("x-ratelimit-reset-requests", "231329"); // 2d16h15m29s in seconds
    mockHeaders.set("x-ratelimit-limit-tokens", "725000");
    mockHeaders.set("x-ratelimit-remaining-tokens", "112358");
    mockHeaders.set("x-ratelimit-reset-tokens", "100855"); // 27h55s451ms in seconds

    // Create metadata from headers
    const speechResponseMetadata =
      OpenAiAudioSpeechResponseMetadata.from(mockHeaders);

    // Verify metadata is created
    expect(speechResponseMetadata).not.toBeNull();

    // Verify rate limit information
    const rateLimit = speechResponseMetadata.rateLimit;
    expect(rateLimit).not.toBeNull();

    const requestsLimit = rateLimit.requestsLimit;
    const tokensLimit = rateLimit.tokensLimit;
    const tokensRemaining = rateLimit.tokensRemaining;
    const requestsRemaining = rateLimit.requestsRemaining;
    const requestsReset = rateLimit.requestsReset;
    const tokensReset = rateLimit.tokensReset;

    // Verify all values match expected
    expect(requestsLimit).toBe(4000);
    expect(tokensLimit).toBe(725000);
    expect(tokensRemaining).toBe(112358);
    expect(requestsRemaining).toBe(999);
    expect(requestsReset).toBe(ms(231329000)); // 2d16h15m29s
    expect(tokensReset).toBe(ms(100855000)); // 27h55s
  });

  it("metadata handles partial rate limit headers", () => {
    // Mock headers with only request rate limits
    const mockHeaders = new Headers();

    mockHeaders.set("x-ratelimit-limit-requests", "1000");
    mockHeaders.set("x-ratelimit-remaining-requests", "500");
    mockHeaders.set("x-ratelimit-reset-requests", "60");
    mockHeaders.set("x-ratelimit-limit-tokens", "");
    mockHeaders.set("x-ratelimit-remaining-tokens", "");
    mockHeaders.set("x-ratelimit-reset-tokens", "");

    const metadata = OpenAiAudioSpeechResponseMetadata.from(mockHeaders);

    const rateLimit = metadata.rateLimit;
    expect(rateLimit.requestsLimit).toBe(1000);
    expect(rateLimit.requestsRemaining).toBe(500);
    expect(rateLimit.requestsReset).toBe(ms(60_000));
    // When token headers are not present, should return null (not 0)
    expect(rateLimit.tokensLimit).toBe(0);
    expect(rateLimit.tokensRemaining).toBe(0);
    expect(rateLimit.tokensReset).toBe(ms(0));
  });

  it("metadata handles empty headers", () => {
    // Mock headers with no rate limit information
    const mockHeaders = new Headers();

    mockHeaders.set("x-ratelimit-limit-requests", "");
    mockHeaders.set("x-ratelimit-remaining-requests", "");
    mockHeaders.set("x-ratelimit-reset-requests", "");
    mockHeaders.set("x-ratelimit-limit-tokens", "");
    mockHeaders.set("x-ratelimit-remaining-tokens", "");
    mockHeaders.set("x-ratelimit-reset-tokens", "");

    const metadata = OpenAiAudioSpeechResponseMetadata.from(mockHeaders);

    // Should return EmptyRateLimit when no headers present (returns 0L not null)
    const rateLimit = metadata.rateLimit;
    expect(rateLimit).not.toBeNull();
    expect(rateLimit.requestsLimit).toBe(0);
    expect(rateLimit.tokensLimit).toBe(0);
  });

  it("metadata handles invalid header values", () => {
    // Mock headers with invalid values
    const mockHeaders = new Headers();

    mockHeaders.set("x-ratelimit-limit-requests", "invalid");
    mockHeaders.set("x-ratelimit-remaining-requests", "not-a-number");
    mockHeaders.set("x-ratelimit-reset-requests", "bad-duration");
    mockHeaders.set("x-ratelimit-limit-tokens", "");
    mockHeaders.set("x-ratelimit-remaining-tokens", "");
    mockHeaders.set("x-ratelimit-reset-tokens", "");

    const metadata = OpenAiAudioSpeechResponseMetadata.from(mockHeaders);

    // Should gracefully handle invalid values by returning EmptyRateLimit (0L not null)
    const rateLimit = metadata.rateLimit;
    expect(rateLimit).not.toBeNull();
    expect(rateLimit.requestsLimit).toBe(0);
    expect(rateLimit.requestsRemaining).toBe(0);
    expect(rateLimit.requestsReset).toBe(ms(0));
  });
});
