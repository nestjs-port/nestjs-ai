import { describe, expect, it } from "vitest";
import { parseDuration } from "../open-ai-response-header-extractor";

/**
 * Unit Tests for OpenAiResponseHeaderExtractor.
 */
describe("OpenAiResponseHeaderExtractor", () => {
  it("parse time as duration with days hours minutes seconds", () => {
    const actual = parseDuration("6d18h22m45s");

    // 6 days + 18 hours + 22 minutes + 45 seconds in milliseconds
    const expected =
      6 * 24 * 60 * 60 * 1000 + // 6 days
      18 * 60 * 60 * 1000 + // 18 hours
      22 * 60 * 1000 + // 22 minutes
      45 * 1000; // 45 seconds

    expect(actual).toBe(expected);
  });

  it("parse time as duration with minutes seconds milliseconds and nanoseconds", () => {
    const actual = parseDuration("42m18s451ms21541ns");

    // 42 minutes + 18 seconds + 451 milliseconds + 21541 nanoseconds
    const expected =
      42 * 60 * 1000 + // 42 minutes
      18 * 1000 + // 18 seconds
      451 + // 451 milliseconds
      21541 / 1_000_000; // 21541 nanoseconds

    expect(actual).toBeCloseTo(expected, 10);
  });

  it("parse time as duration with days minutes and milliseconds", () => {
    const actual = parseDuration("2d15m981ms");

    // 2 days + 15 minutes + 981 milliseconds
    const expected =
      2 * 24 * 60 * 60 * 1000 + // 2 days
      15 * 60 * 1000 + // 15 minutes
      981; // 981 milliseconds

    expect(actual).toBe(expected);
  });
});
