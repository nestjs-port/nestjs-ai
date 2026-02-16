import type { ApiKey } from "./api-key.interface";

/**
 * This implementation of ApiKey indicates that no API key should be used, e.g. no HTTP
 * headers should be set.
 */
export class NoopApiKey implements ApiKey {
  get value(): string {
    return "";
  }
}
