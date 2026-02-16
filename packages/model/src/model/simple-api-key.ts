import assert from "node:assert/strict";
import type { ApiKey } from "./api-key.interface";

/**
 * A simple implementation of {@link ApiKey} that holds an immutable API key value. This
 * implementation is suitable for cases where the API key is static and does not need to
 * be refreshed or rotated.
 */
export class SimpleApiKey implements ApiKey {
  private readonly _value: string;

  /**
   * Create a new SimpleApiKey.
   * @param value - the API key value, must not be null
   * @throws Error if value is null
   */
  constructor(value: string) {
    assert(value != null, "API key value must not be null");
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  [Symbol.toPrimitive](): string {
    return "SimpleApiKey{value='***'}";
  }
}
