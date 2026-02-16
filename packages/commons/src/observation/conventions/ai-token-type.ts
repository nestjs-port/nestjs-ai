/**
 * Represents the type of AI token being measured.
 * Based on OpenTelemetry GenAI semantic conventions.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiTokenType {
  /**
   * Input token type (prompt tokens).
   */
  static readonly INPUT = new AiTokenType("input");

  /**
   * Output token type (completion tokens).
   */
  static readonly OUTPUT = new AiTokenType("output");

  /**
   * Total token type (combined input + output).
   */
  static readonly TOTAL = new AiTokenType("total");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the token type.
   * @returns the value of the token type
   */
  get value(): string {
    return this._value;
  }
}
