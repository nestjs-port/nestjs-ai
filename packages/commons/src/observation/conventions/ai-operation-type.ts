/**
 * Represents the type of AI operation being performed.
 * Based on OpenTelemetry GenAI semantic conventions.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiOperationType {
  /**
   * Chat operation type.
   */
  static readonly CHAT = new AiOperationType("chat");

  /**
   * Embedding operation type.
   */
  static readonly EMBEDDING = new AiOperationType("embedding");

  /**
   * Framework operation type.
   */
  static readonly FRAMEWORK = new AiOperationType("framework");

  /**
   * Image generation operation type.
   */
  static readonly IMAGE = new AiOperationType("image");

  /**
   * Text completion operation type.
   */
  static readonly TEXT_COMPLETION = new AiOperationType("text_completion");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the operation type.
   * @returns the value of the operation type
   */
  get value(): string {
    return this._value;
  }
}
