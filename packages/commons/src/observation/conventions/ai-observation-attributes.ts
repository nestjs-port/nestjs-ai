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
 * OpenTelemetry GenAI semantic convention attribute keys.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiObservationAttributes {
  static readonly AI_OPERATION_TYPE = new AiObservationAttributes(
    "gen_ai.operation.name",
  );
  static readonly AI_PROVIDER = new AiObservationAttributes("gen_ai.system");
  static readonly REQUEST_MODEL = new AiObservationAttributes(
    "gen_ai.request.model",
  );
  static readonly REQUEST_FREQUENCY_PENALTY = new AiObservationAttributes(
    "gen_ai.request.frequency_penalty",
  );
  static readonly REQUEST_MAX_TOKENS = new AiObservationAttributes(
    "gen_ai.request.max_tokens",
  );
  static readonly REQUEST_PRESENCE_PENALTY = new AiObservationAttributes(
    "gen_ai.request.presence_penalty",
  );
  static readonly REQUEST_STOP_SEQUENCES = new AiObservationAttributes(
    "gen_ai.request.stop_sequences",
  );
  static readonly REQUEST_TEMPERATURE = new AiObservationAttributes(
    "gen_ai.request.temperature",
  );
  static readonly REQUEST_TOOL_NAMES = new AiObservationAttributes(
    "spring.ai.model.request.tool.names",
  );
  static readonly REQUEST_TOP_K = new AiObservationAttributes(
    "gen_ai.request.top_k",
  );
  static readonly REQUEST_TOP_P = new AiObservationAttributes(
    "gen_ai.request.top_p",
  );
  static readonly REQUEST_EMBEDDING_DIMENSIONS = new AiObservationAttributes(
    "gen_ai.request.embedding.dimensions",
  );
  static readonly REQUEST_IMAGE_RESPONSE_FORMAT = new AiObservationAttributes(
    "gen_ai.request.image.response_format",
  );
  static readonly REQUEST_IMAGE_SIZE = new AiObservationAttributes(
    "gen_ai.request.image.size",
  );
  static readonly REQUEST_IMAGE_STYLE = new AiObservationAttributes(
    "gen_ai.request.image.style",
  );
  static readonly RESPONSE_FINISH_REASONS = new AiObservationAttributes(
    "gen_ai.response.finish_reasons",
  );
  static readonly RESPONSE_ID = new AiObservationAttributes(
    "gen_ai.response.id",
  );
  static readonly RESPONSE_MODEL = new AiObservationAttributes(
    "gen_ai.response.model",
  );
  static readonly USAGE_INPUT_TOKENS = new AiObservationAttributes(
    "gen_ai.usage.input_tokens",
  );
  static readonly USAGE_OUTPUT_TOKENS = new AiObservationAttributes(
    "gen_ai.usage.output_tokens",
  );
  static readonly USAGE_TOTAL_TOKENS = new AiObservationAttributes(
    "gen_ai.usage.total_tokens",
  );

  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }
}
