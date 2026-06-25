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

import assert from "node:assert/strict";
import type { EmbeddingOptions } from "@nestjs-ai/model";
import { StringUtils } from "@nestjs-port/core";
import { GoogleGenAiTextEmbeddingModelName } from "./google-gen-ai-text-embedding-model-name.js";

export type GoogleGenAiTextEmbeddingOptionsProps = Omit<
  EmbeddingOptions,
  "model"
> & {
  model?: string | GoogleGenAiTextEmbeddingModelName | null;
  taskType?: GoogleGenAiTextEmbeddingOptions.TaskType | null;
  dimensions?: number | null;
  title?: string | null;
  autoTruncate?: boolean | null;
};

/**
 * Options for the Embedding supported by the GenAI SDK
 */
export class GoogleGenAiTextEmbeddingOptions implements EmbeddingOptions {
  static readonly DEFAULT_MODEL_NAME =
    GoogleGenAiTextEmbeddingModelName.GEMINI_EMBEDDING_001.name;

  private _model: string | null = null;
  private _taskType: GoogleGenAiTextEmbeddingOptions.TaskType | null = null;
  private _dimensions: number | null = null;
  private _title: string | null = null;
  private _autoTruncate: boolean | null = null;

  constructor(props: GoogleGenAiTextEmbeddingOptionsProps = {}) {
    this._model = GoogleGenAiTextEmbeddingOptions.resolveModelName(props.model);
    this._taskType = props.taskType ?? null;
    this._dimensions = props.dimensions ?? null;
    this._title = props.title ?? null;
    this._autoTruncate = props.autoTruncate ?? null;
  }

  static builder(): GoogleGenAiTextEmbeddingOptions.Builder {
    return new GoogleGenAiTextEmbeddingOptions.Builder();
  }

  initializeDefaults(): this {
    if (this.taskType == null) {
      this.taskType =
        GoogleGenAiTextEmbeddingOptions.TaskType.RETRIEVAL_DOCUMENT;
    }

    assert(
      !StringUtils.hasText(this.title) ||
        this.taskType ===
          GoogleGenAiTextEmbeddingOptions.TaskType.RETRIEVAL_DOCUMENT,
      "Title is only valid with task_type=RETRIEVAL_DOCUMENT",
    );

    return this;
  }

  /**
   * The embedding model name to use. Supported models are: gemini-embedding-001
   * (recommended for Gemini API), text-embedding-004, text-multilingual-embedding-002
   * and multimodalembedding@001.
   */
  get model(): string | null {
    return this._model;
  }

  set model(model: string | null) {
    this._model = model ?? null;
  }

  /**
   * The intended downstream application to help the model produce better quality embeddings.
   * Not all model versions support all task types.
   */
  get taskType(): GoogleGenAiTextEmbeddingOptions.TaskType | null {
    return this._taskType;
  }

  set taskType(taskType: GoogleGenAiTextEmbeddingOptions.TaskType | null) {
    this._taskType = taskType ?? null;
  }

  /**
   * The number of dimensions the resulting output embeddings should have.
   * Supported for model version 004 and later. You can use this parameter to reduce the
   * embedding size, for example, for storage optimization.
   */
  get dimensions(): number | null {
    return this._dimensions;
  }

  set dimensions(dimensions: number | null) {
    this._dimensions = dimensions ?? null;
  }

  /**
   * Optional title, only valid with task_type=RETRIEVAL_DOCUMENT.
   */
  get title(): string | null {
    return this._title;
  }

  set title(title: string | null) {
    this._title = title ?? null;
  }

  /**
   * When set to true, input text will be truncated. When set to false, an error is returned
   * if the input text is longer than the maximum length supported by the model. Defaults to true.
   */
  get autoTruncate(): boolean | null {
    return this._autoTruncate;
  }

  set autoTruncate(autoTruncate: boolean | null) {
    this._autoTruncate = autoTruncate ?? null;
  }

  static resolveModelName(
    model: string | GoogleGenAiTextEmbeddingModelName | null | undefined,
  ): string | null {
    if (model == null) {
      return null;
    }

    return typeof model === "string" ? model : model.name;
  }
}

export namespace GoogleGenAiTextEmbeddingOptions {
  export enum TaskType {
    /**
     * Specifies the given text is a query in a search/retrieval setting.
     */
    RETRIEVAL_QUERY = "RETRIEVAL_QUERY",

    /**
     * Specifies the given text is a document in a search/retrieval setting.
     */
    RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT",

    /**
     * Specifies the given text will be used for semantic textual similarity (STS).
     */
    SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY",

    /**
     * Specifies that the embeddings will be used for classification.
     */
    CLASSIFICATION = "CLASSIFICATION",

    /**
     * Specifies that the embeddings will be used for clustering.
     */
    CLUSTERING = "CLUSTERING",

    /**
     * Specifies that the query embedding is used for answering questions. Use
     * RETRIEVAL_DOCUMENT for the document side.
     */
    QUESTION_ANSWERING = "QUESTION_ANSWERING",

    /**
     * Specifies that the query embedding is used for fact verification.
     */
    FACT_VERIFICATION = "FACT_VERIFICATION",
  }

  export class Builder {
    private readonly _options = new GoogleGenAiTextEmbeddingOptions();

    from(fromOptions: GoogleGenAiTextEmbeddingOptions): this {
      if (fromOptions.dimensions != null) {
        this._options.dimensions = fromOptions.dimensions;
      }
      if (StringUtils.hasText(fromOptions.model)) {
        this._options.model = fromOptions.model;
      }
      if (fromOptions.taskType != null) {
        this._options.taskType = fromOptions.taskType;
      }
      if (fromOptions.autoTruncate != null) {
        this._options.autoTruncate = fromOptions.autoTruncate;
      }
      if (StringUtils.hasText(fromOptions.title)) {
        this._options.title = fromOptions.title;
      }
      return this;
    }

    model(model: string | GoogleGenAiTextEmbeddingModelName | null): this {
      this._options.model =
        GoogleGenAiTextEmbeddingOptions.resolveModelName(model);
      return this;
    }

    taskType(taskType: GoogleGenAiTextEmbeddingOptions.TaskType | null): this {
      this._options.taskType = taskType;
      return this;
    }

    dimensions(dimensions: number | null): this {
      this._options.dimensions = dimensions;
      return this;
    }

    title(title: string | null): this {
      this._options.title = title;
      return this;
    }

    autoTruncate(autoTruncate: boolean | null): this {
      this._options.autoTruncate = autoTruncate;
      return this;
    }

    build(): GoogleGenAiTextEmbeddingOptions {
      return this._options;
    }
  }
}
