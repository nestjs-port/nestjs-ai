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

  get(key: string): string | undefined {
    for (let i = this._values.length - 1; i >= 0; i--) {
      const keyValue = this._values[i];
      if (keyValue.key === key) {
        return keyValue.value;
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  *keys(): IterableIterator<string> {
    const seen = new Set<string>();
    for (let i = this._values.length - 1; i >= 0; i--) {
      const key = this._values[i].key;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      yield key;
    }
  }

  [Symbol.iterator](): Iterator<KeyValue> {
    return this._values[Symbol.iterator]();
  }
}
