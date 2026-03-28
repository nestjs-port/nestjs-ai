/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
