/**
 * Context object that carries information throughout the observation lifecycle.
 * Corresponds to Micrometer's Observation.Context.
 */
export class ObservationContext {
  private _name = "";
  private _contextualName: string | null = null;
  private _error: Error | null = null;

  private readonly _lowCardinality = new Map<string, string>();
  private readonly _highCardinality = new Map<string, string>();

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

  get lowCardinalityKeyValues(): ReadonlyMap<string, string> {
    return this._lowCardinality;
  }

  get highCardinalityKeyValues(): ReadonlyMap<string, string> {
    return this._highCardinality;
  }

  addLowCardinalityKeyValue(key: string, value: string): void {
    this._lowCardinality.set(key, value);
  }

  addHighCardinalityKeyValue(key: string, value: string): void {
    this._highCardinality.set(key, value);
  }
}
