import type { Milliseconds } from "@nestjs-ai/commons";
import { LoggerFactory, ms } from "@nestjs-ai/commons";
import type { RateLimit } from "@nestjs-ai/model";
import { OpenAiRateLimit } from "../open-ai-rate-limit";
import { OpenAiApiResponseHeaders } from "./open-ai-api-response-headers";

/**
 * Utility used to extract known HTTP response headers for the OpenAI API.
 */
export class OpenAiResponseHeaderExtractor {
  private static readonly logger = LoggerFactory.getLogger(
    OpenAiResponseHeaderExtractor.name,
  );

  private constructor() {
    // Prevent instantiation
  }

  /**
   * Extract rate limit information from HTTP response headers.
   * @param headers - HTTP response headers
   * @returns RateLimit instance with extracted values
   */
  static extractAiResponseHeaders(headers: Headers): RateLimit {
    const requestsLimit = OpenAiResponseHeaderExtractor.getHeaderAsLong(
      headers,
      OpenAiApiResponseHeaders.REQUESTS_LIMIT_HEADER,
    );
    const requestsRemaining = OpenAiResponseHeaderExtractor.getHeaderAsLong(
      headers,
      OpenAiApiResponseHeaders.REQUESTS_REMAINING_HEADER,
    );
    const tokensLimit = OpenAiResponseHeaderExtractor.getHeaderAsLong(
      headers,
      OpenAiApiResponseHeaders.TOKENS_LIMIT_HEADER,
    );
    const tokensRemaining = OpenAiResponseHeaderExtractor.getHeaderAsLong(
      headers,
      OpenAiApiResponseHeaders.TOKENS_REMAINING_HEADER,
    );

    const requestsReset = OpenAiResponseHeaderExtractor.getHeaderAsDuration(
      headers,
      OpenAiApiResponseHeaders.REQUESTS_RESET_HEADER,
    );
    const tokensReset = OpenAiResponseHeaderExtractor.getHeaderAsDuration(
      headers,
      OpenAiApiResponseHeaders.TOKENS_RESET_HEADER,
    );

    return new OpenAiRateLimit(
      requestsLimit ?? 0,
      requestsRemaining ?? 0,
      requestsReset ?? ms(0),
      tokensLimit ?? 0,
      tokensRemaining ?? 0,
      tokensReset ?? ms(0),
    );
  }

  private static getHeaderAsDuration(
    headers: Headers,
    headerName: OpenAiApiResponseHeaders,
  ): Milliseconds | null {
    const value = headers.get(headerName);
    if (value) {
      return parseDuration(value);
    }
    return null;
  }

  private static getHeaderAsLong(
    headers: Headers,
    headerName: OpenAiApiResponseHeaders,
  ): number | null {
    const value = headers.get(headerName);
    if (value) {
      return OpenAiResponseHeaderExtractor.parseLong(headerName, value);
    }
    return null;
  }

  private static parseLong(
    headerName: OpenAiApiResponseHeaders,
    headerValue: string,
  ): number | null {
    if (headerValue && headerValue.trim().length > 0) {
      try {
        return Number.parseInt(headerValue.trim(), 10);
      } catch (error) {
        OpenAiResponseHeaderExtractor.logger.warn(
          `Value [${headerValue}] for HTTP header [${headerName}] is not valid: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return null;
  }
}

const TIME_UNIT_PATTERN = /\d+[a-zA-Z]{1,2}/g;

export function parseDuration(text: string): Milliseconds {
  if (!text || text.trim().length === 0) {
    throw new Error(
      `Text [${text}] to parse as a Duration must not be null or empty`,
    );
  }

  const matches = text.matchAll(TIME_UNIT_PATTERN);
  let totalMs = 0;

  for (const match of matches) {
    const value = match[0];
    const unit = DurationUnit.parseUnit(value);
    const time = parseTime(value);
    totalMs += unit.toMs(time);
  }

  return ms(totalMs);
}

interface DurationUnitInfo {
  symbol: string;
  name: string;
  toMs: (value: number) => number;
}

const durationUnits: Record<string, DurationUnitInfo> = {
  ns: {
    symbol: "ns",
    name: "nanoseconds",
    toMs: (value: number) => value / 1_000_000,
  },
  us: {
    symbol: "us",
    name: "microseconds",
    toMs: (value: number) => value / 1_000,
  },
  ms: {
    symbol: "ms",
    name: "milliseconds",
    toMs: (value: number) => value,
  },
  s: {
    symbol: "s",
    name: "seconds",
    toMs: (value: number) => value * 1_000,
  },
  m: {
    symbol: "m",
    name: "minutes",
    toMs: (value: number) => value * 60 * 1_000,
  },
  h: {
    symbol: "h",
    name: "hours",
    toMs: (value: number) => value * 60 * 60 * 1_000,
  },
  d: {
    symbol: "d",
    name: "days",
    toMs: (value: number) => value * 24 * 60 * 60 * 1_000,
  },
};

const DurationUnit = {
  parseUnit(value: string): DurationUnitInfo {
    const symbol = parseSymbol(value);
    const unit = durationUnits[symbol.toLowerCase()];
    if (!unit) {
      throw new Error(`Value [${value}] does not contain a valid time unit`);
    }
    return unit;
  },
};

function parse(value: string, predicate: (char: string) => boolean): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Value [${value}] must not be null or empty`);
  }
  let result = "";
  for (const char of value) {
    if (predicate(char)) {
      result += char;
    }
  }
  return result;
}

function parseSymbol(value: string): string {
  return parse(value, (char) => /[a-zA-Z]/.test(char));
}

function parseTime(value: string): number {
  return Number.parseInt(
    parse(value, (char) => /\d/.test(char)),
    10,
  );
}
