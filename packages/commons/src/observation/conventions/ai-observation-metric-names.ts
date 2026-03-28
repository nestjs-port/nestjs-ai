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
 * OpenTelemetry GenAI semantic convention metric names.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiObservationMetricNames {
  /**
   * Histogram metric recording operation duration.
   */
  static readonly OPERATION_DURATION = new AiObservationMetricNames(
    "gen_ai.client.operation.duration",
  );

  /**
   * Counter metric recording token usage.
   */
  static readonly TOKEN_USAGE = new AiObservationMetricNames(
    "gen_ai.client.token.usage",
  );

  private constructor(private readonly _value: string) {}

  /**
   * Return the metric name.
   * @returns the metric name
   */
  get value(): string {
    return this._value;
  }
}
