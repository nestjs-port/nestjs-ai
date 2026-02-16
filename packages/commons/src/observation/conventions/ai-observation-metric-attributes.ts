/**
 * OpenTelemetry GenAI semantic convention metric attribute keys.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiObservationMetricAttributes {
  /**
   * Attribute key indicating the token type (input, output, total).
   */
  static readonly TOKEN_TYPE = new AiObservationMetricAttributes(
    "gen_ai.token.type",
  );

  private constructor(private readonly _value: string) {}

  /**
   * Return the metric attribute key.
   * @returns the metric attribute key
   */
  get value(): string {
    return this._value;
  }
}
