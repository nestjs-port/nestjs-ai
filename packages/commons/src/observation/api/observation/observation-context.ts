import type { KeyValue } from "../key-value";
import { KeyValues } from "../key-values";

/**
 * Context object that carries information throughout the observation lifecycle.
 * Corresponds to Micrometer's Observation.Context.
 */
export class ObservationContext {
  private _name = "";
  private _contextualName: string | null = null;
  private _error: Error | null = null;

  private readonly _lowCardinality = new Map<string, KeyValue>();
  private readonly _highCardinality = new Map<string, KeyValue>();

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get contextualName(): string | null {
    return this._contextualName;
  }

  set contextualName(contextualName: string | null) {
    this._contextualName = contextualName;
  }

  get error(): Error | null {
    return this._error;
  }

  set error(error: Error | null) {
    this._error = error;
  }

  get lowCardinalityKeyValues(): KeyValues {
    return KeyValues.of(...this._lowCardinality.values());
  }

  get highCardinalityKeyValues(): KeyValues {
    return KeyValues.of(...this._highCardinality.values());
  }

  addLowCardinalityKeyValue(keyValue: KeyValue): this {
    this._lowCardinality.set(keyValue.key, keyValue);
    return this;
  }

  addHighCardinalityKeyValue(keyValue: KeyValue): this {
    this._highCardinality.set(keyValue.key, keyValue);
    return this;
  }

  addLowCardinalityKeyValues(keyValues: KeyValues): this {
    for (const keyValue of keyValues) {
      this.addLowCardinalityKeyValue(keyValue);
    }
    return this;
  }

  addHighCardinalityKeyValues(keyValues: KeyValues): this {
    for (const keyValue of keyValues) {
      this.addHighCardinalityKeyValue(keyValue);
    }
    return this;
  }
}
