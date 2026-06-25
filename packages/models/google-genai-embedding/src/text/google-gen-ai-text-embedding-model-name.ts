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

import { EmbeddingModelDescription } from "@nestjs-ai/model";

/**
 * VertexAI Embedding Models: - {@link https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api | Text
 * embeddings} - {@link https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-embeddings-api | Multimodal
 * embeddings}
 */
export class GoogleGenAiTextEmbeddingModelName extends EmbeddingModelDescription {
  /**
   * English model. Deprecated January 14, 2026; use GEMINI_EMBEDDING_001 for Gemini
   * API.
   */
  static readonly TEXT_EMBEDDING_004 = new GoogleGenAiTextEmbeddingModelName(
    "text-embedding-004",
    "004",
    768,
    "English text model",
  );

  /**
   * Multilingual model. Expires on May 14, 2025.
   */
  static readonly TEXT_MULTILINGUAL_EMBEDDING_002 =
    new GoogleGenAiTextEmbeddingModelName(
      "text-multilingual-embedding-002",
      "002",
      768,
      "Multilingual text model",
    );

  /**
   * Recommended embedding model for Gemini API. Supports 100+ languages, 3072
   * dimensions (configurable via outputDimensionality). Use this as default for API key
   * mode.
   */
  static readonly GEMINI_EMBEDDING_001 = new GoogleGenAiTextEmbeddingModelName(
    "gemini-embedding-001",
    "001",
    3072,
    "Multilingual embedding model",
  );

  private readonly _modelVersion: string;

  private readonly _modelName: string;

  private readonly _description: string;

  private readonly _dimensions: number;

  private constructor(
    value: string,
    modelVersion: string,
    dimensions: number,
    description: string,
  ) {
    super();
    this._modelName = value;
    this._modelVersion = modelVersion;
    this._dimensions = dimensions;
    this._description = description;
  }

  static values(): GoogleGenAiTextEmbeddingModelName[] {
    return [
      GoogleGenAiTextEmbeddingModelName.TEXT_EMBEDDING_004,
      GoogleGenAiTextEmbeddingModelName.TEXT_MULTILINGUAL_EMBEDDING_002,
      GoogleGenAiTextEmbeddingModelName.GEMINI_EMBEDDING_001,
    ];
  }

  get name(): string {
    return this._modelName;
  }

  get version(): string {
    return this._modelVersion;
  }

  get dimensions(): number {
    return this._dimensions;
  }

  get description(): string {
    return this._description;
  }
}
