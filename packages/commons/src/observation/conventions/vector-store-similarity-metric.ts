/**
 * Types of similarity metrics used in vector store operations.
 * Based on the OpenTelemetry Semantic Conventions for Vector Databases.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/database | DB Semantic Conventions}
 */
export class VectorStoreSimilarityMetric {
  /**
   * The cosine metric.
   */
  static readonly COSINE = new VectorStoreSimilarityMetric("cosine");

  /**
   * The dot product metric.
   */
  static readonly DOT = new VectorStoreSimilarityMetric("dot");

  /**
   * The euclidean distance metric.
   */
  static readonly EUCLIDEAN = new VectorStoreSimilarityMetric("euclidean");

  /**
   * The manhattan distance metric.
   */
  static readonly MANHATTAN = new VectorStoreSimilarityMetric("manhattan");

  private constructor(private readonly _value: string) {}

  /**
   * Return the value of the similarity metric.
   * @returns the value of the similarity metric
   */
  get value(): string {
    return this._value;
  }
}
