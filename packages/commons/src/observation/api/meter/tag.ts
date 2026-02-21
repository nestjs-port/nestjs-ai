/**
 * Represents a key-value pair used as a metric tag.
 * Corresponds to Micrometer's Tag.
 */
export class Tag {
  private constructor(
    private readonly _key: string,
    private readonly _value: string,
  ) {}

  get key(): string {
    return this._key;
  }

  get value(): string {
    return this._value;
  }

  static of(key: string, value: string): Tag {
    return new Tag(key, value);
  }
}
