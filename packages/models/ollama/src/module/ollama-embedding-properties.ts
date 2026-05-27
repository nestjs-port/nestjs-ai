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

import { OllamaModel } from "../api/ollama-model.js";
import type { OllamaEmbeddingOptionsProps } from "../api/ollama-embedding-options.js";
import type { OllamaInitializationProperties } from "./ollama-initialization-properties.js";

export const OLLAMA_EMBEDDING_DEFAULT_MODEL =
  OllamaModel.MXBAI_EMBED_LARGE.id();

/**
 * Nest module properties for the Ollama embedding model.
 */
export interface OllamaEmbeddingProperties extends OllamaInitializationProperties {
  options?: Partial<OllamaEmbeddingOptionsProps>;
}
