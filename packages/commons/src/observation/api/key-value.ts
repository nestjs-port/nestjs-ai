/**
 * Represents a key-value pair for observation attributes.
 * Corresponds to Micrometer's KeyValue.
 */
export class KeyValue {
  static readonly NONE_VALUE = "none";

  private readonly _key: string;
  private readonly _value: string;

  constructor(key: string, value: string) {
    this._key = key;
    this._value = value;
  }

  get key(): string {
    return this._key;
  }

  get value(): string {
    return this._value;
  }

  static of(key: string, value: string): KeyValue {
    return new KeyValue(key, value);
  }
}
