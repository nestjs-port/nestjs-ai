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

import { GoogleGenAiTextEmbeddingModelName } from "../text/google-gen-ai-text-embedding-model-name.js";
import type { GoogleGenAiTextEmbeddingOptionsProps } from "../text/google-gen-ai-text-embedding-options.js";

export const GOOGLE_GEN_AI_TEXT_EMBEDDING_DEFAULT_MODEL =
  GoogleGenAiTextEmbeddingModelName.GEMINI_EMBEDDING_001.name;

/**
 * Connection properties for Google GenAI Embedding.
 */
export interface GoogleGenAiEmbeddingConnectionProperties {
  /**
   * Google GenAI API Key (for Gemini Developer API mode).
   */
  apiKey?: string;
  /**
   * Google Cloud project ID (for Vertex AI mode).
   */
  projectId?: string;
  /**
   * Google Cloud location (for Vertex AI mode).
   */
  location?: string;
  /**
   * URI to Google Cloud credentials (optional, for Vertex AI mode).
   */
  credentialsUri?: string;
  /**
   * Whether to use Vertex AI mode. If false, uses Gemini Developer API mode. This is
   * automatically determined based on whether apiKey or projectId is set.
   */
  vertexAi?: boolean;
}

/**
 * Nest module properties for the Google GenAI text embedding model.
 */
export interface GoogleGenAiTextEmbeddingProperties extends GoogleGenAiEmbeddingConnectionProperties {
  /**
   * Google GenAI Text Embedding API options.
   */
  options?: Partial<GoogleGenAiTextEmbeddingOptionsProps>;
}
