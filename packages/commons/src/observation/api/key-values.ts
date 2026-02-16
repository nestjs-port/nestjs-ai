import { KeyValue } from "./key-value";

/**
 * Collection of {@link KeyValue} entries.
 * Corresponds to Micrometer's KeyValues.
 */
export class KeyValues implements Iterable<KeyValue> {
  private readonly _values: KeyValue[];

  constructor(values: KeyValue[] = []) {
    this._values = [...values];
  }

  static empty(): KeyValues {
    return new KeyValues();
  }

  static of(...keyValues: KeyValue[]): KeyValues {
    return new KeyValues(keyValues);
  }

  and(key: string, value: string): KeyValues;
  and(keyValue: KeyValue): KeyValues;
  and(keyOrKeyValue: string | KeyValue, value?: string): KeyValues {
    if (keyOrKeyValue instanceof KeyValue) {
      return new KeyValues([...this._values, keyOrKeyValue]);
    }

    if (value === undefined) {
      throw new Error("value must be provided when key is a string");
    }

    return new KeyValues([...this._values, KeyValue.of(keyOrKeyValue, value)]);
  }

  toArray(): KeyValue[] {
    return [...this._values];
  }

  [Symbol.iterator](): Iterator<KeyValue> {
    return this._values[Symbol.iterator]();
  }
}
