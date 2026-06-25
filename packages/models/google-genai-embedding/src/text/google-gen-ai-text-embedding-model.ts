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
import { AiProvider, type Document } from "@nestjs-ai/commons";
import {
  AbstractEmbeddingModel,
  DefaultEmbeddingModelObservationConvention,
  DefaultUsage,
  Embedding,
  EmbeddingModelObservationContext,
  type EmbeddingModelObservationConvention,
  EmbeddingModelObservationDocumentation,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResponseMetadata,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
  type RetryTemplate,
  StringUtils,
} from "@nestjs-port/core";
import type {
  ContentEmbedding,
  EmbedContentResponse,
  GoogleGenAI,
} from "@google/genai";
import type { GoogleGenAiEmbeddingConnectionDetails } from "../google-gen-ai-embedding-connection-details.js";
import { GoogleGenAiTextEmbeddingModelName } from "./google-gen-ai-text-embedding-model-name.js";
import { GoogleGenAiTextEmbeddingOptions } from "./google-gen-ai-text-embedding-options.js";

export interface GoogleGenAiTextEmbeddingModelProps {
  connectionDetails: GoogleGenAiEmbeddingConnectionDetails;
  defaultOptions: GoogleGenAiTextEmbeddingOptions;
  retryTemplate?: RetryTemplate | null;
  observationRegistry?: ObservationRegistry | null;
}

/**
 * A class representing a Vertex AI Text Embedding Model using the new Google Gen AI SDK.
 */
export class GoogleGenAiTextEmbeddingModel extends AbstractEmbeddingModel {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultEmbeddingModelObservationConvention();

  static readonly #KNOWN_EMBEDDING_DIMENSIONS = new Map<string, number>(
    GoogleGenAiTextEmbeddingModelName.values().map(
      (modelName): [string, number] => [modelName.name, modelName.dimensions],
    ),
  );

  readonly defaultOptions: GoogleGenAiTextEmbeddingOptions;

  private readonly _connectionDetails: GoogleGenAiEmbeddingConnectionDetails;
  private readonly _retryTemplate: RetryTemplate;

  /**
   * Observation registry used for instrumentation.
   */
  private readonly _observationRegistry: ObservationRegistry;

  /**
   * Conventions to use for generating observations.
   */
  private _observationConvention: EmbeddingModelObservationConvention =
    GoogleGenAiTextEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION;

  /**
   * The GenAI client instance.
   */
  private readonly _genAiClient: GoogleGenAI;

  constructor(props: GoogleGenAiTextEmbeddingModelProps) {
    super();
    assert(
      props.connectionDetails != null,
      "GoogleGenAiEmbeddingConnectionDetails must not be null",
    );
    assert(
      props.defaultOptions != null,
      "GoogleGenAiTextEmbeddingOptions must not be null",
    );

    this.defaultOptions = props.defaultOptions.initializeDefaults();
    this._connectionDetails = props.connectionDetails;
    this._genAiClient = props.connectionDetails.genAiClient;
    this._retryTemplate =
      props.retryTemplate ?? RetryUtils.DEFAULT_RETRY_TEMPLATE;
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    assert(document != null, "Document must not be null");
    return this.embed(document.getFormattedContent());
  }

  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const embeddingRequest = this.buildEmbeddingRequest(request);

    const observationContext = new EmbeddingModelObservationContext(
      embeddingRequest,
      AiProvider.GOOGLE_GENAI_AI.value,
    );

    return new EmbeddingModelObservationDocumentation()
      .observation(
        this._observationConvention,
        GoogleGenAiTextEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      )
      .observe(async () => {
        const options = embeddingRequest.options;
        assert(
          options instanceof GoogleGenAiTextEmbeddingOptions,
          "Options must not be null",
        );

        const model = options.model;
        assert(model != null, "Model must not be null");
        const modelName = this._connectionDetails.getModelEndpointName(model);

        // Build the EmbedContentConfig
        const config: Record<string, unknown> = {};

        // Set dimensions if specified
        if (options.dimensions != null) {
          config.outputDimensionality = options.dimensions;
        }

        // Set task type if specified - this might need to be handled differently
        // as the new SDK might not have a direct taskType field
        // We'll need to check the SDK documentation for this

        // Convert instructions to Content list for embedding
        const texts = embeddingRequest.instructions;

        // Validate that we have texts to embed
        if (texts.length === 0) {
          throw new Error(
            "No embedding input is provided - instructions list is empty",
          );
        }

        // Filter out null or empty strings
        const validTexts = texts.filter((text) => StringUtils.hasText(text));

        if (validTexts.length === 0) {
          throw new Error(
            "No embedding input is provided - all texts are null or empty",
          );
        }

        // Call the embedding API with retry
        const embeddingResponse = await RetryUtils.execute(
          this._retryTemplate,
          async () =>
            this._genAiClient.models.embedContent({
              model: modelName,
              contents: validTexts,
              config,
            }),
        );

        const response = this.generateEmbeddingResponse(
          model,
          texts,
          embeddingResponse,
        );
        observationContext.setResponse(response);
        return response;
      });
  }

  buildEmbeddingRequest(embeddingRequest: EmbeddingRequest): EmbeddingRequest {
    const requestOptions = embeddingRequest.options;
    let mergedOptions = this.defaultOptions;

    if (requestOptions != null) {
      const builder = GoogleGenAiTextEmbeddingOptions.builder()
        .model(mergeOption(requestOptions.model, this.defaultOptions.model))
        .dimensions(
          mergeOption(
            requestOptions.dimensions,
            this.defaultOptions.dimensions,
          ),
        );

      if (requestOptions instanceof GoogleGenAiTextEmbeddingOptions) {
        builder
          .taskType(
            mergeOption(requestOptions.taskType, this.defaultOptions.taskType),
          )
          .title(mergeOption(requestOptions.title, this.defaultOptions.title))
          .autoTruncate(
            mergeOption(
              requestOptions.autoTruncate,
              this.defaultOptions.autoTruncate,
            ),
          );
      } else {
        builder
          .taskType(this.defaultOptions.taskType)
          .title(this.defaultOptions.title)
          .autoTruncate(this.defaultOptions.autoTruncate);
      }

      mergedOptions = builder.build();
    }

    // Validate request options
    if (!StringUtils.hasText(mergedOptions.model)) {
      throw new Error("model cannot be null or empty");
    }

    return new EmbeddingRequest(embeddingRequest.instructions, mergedOptions);
  }

  override async dimensions(): Promise<number> {
    const model = this.defaultOptions.model;
    assert(model != null, "model must not be null");

    const knownDimension =
      GoogleGenAiTextEmbeddingModel.#KNOWN_EMBEDDING_DIMENSIONS.get(model);
    if (knownDimension != null) {
      return knownDimension;
    }

    const computedDimension = await super.dimensions();
    GoogleGenAiTextEmbeddingModel.#KNOWN_EMBEDDING_DIMENSIONS.set(
      model,
      computedDimension,
    );
    return computedDimension;
  }

  /**
   * Use the provided convention for reporting observation data
   * @param observationConvention The provided convention
   */
  setObservationConvention(
    observationConvention: EmbeddingModelObservationConvention,
  ): void {
    assert(
      observationConvention != null,
      "observationConvention cannot be null",
    );
    this._observationConvention = observationConvention;
  }

  private generateEmbeddingResponse(
    model: string,
    texts: string[],
    response: EmbedContentResponse,
  ): EmbeddingResponse {
    // Process the response
    // Note: We need to handle the case where some texts were filtered out
    // The response will only contain embeddings for valid texts
    let totalTokenCount = 0;
    const embeddingList: Embedding[] = [];

    // Create a map to track original indices
    let originalIndex = 0;
    let validIndex = 0;
    const embeddings = this.extractEmbeddings(response);

    if (embeddings != null) {
      for (const originalText of texts) {
        if (
          StringUtils.hasText(originalText) &&
          validIndex < embeddings.length
        ) {
          const contentEmbedding = embeddings[validIndex];

          // Extract the embedding values
          if (contentEmbedding.values != null) {
            embeddingList.push(
              new Embedding([...contentEmbedding.values], originalIndex),
            );
          }

          // Extract token count if available
          if (contentEmbedding.statistics?.tokenCount != null) {
            totalTokenCount += contentEmbedding.statistics.tokenCount;
          }

          validIndex += 1;
        } else if (!StringUtils.hasText(originalText)) {
          // For empty texts, add a null embedding to maintain index
          // alignment
          embeddingList.push(new Embedding([], originalIndex));
        }
        originalIndex += 1;
      }
    }

    return new EmbeddingResponse(
      embeddingList,
      this.generateResponseMetadata(model, totalTokenCount),
    );
  }

  private generateResponseMetadata(
    model: string,
    totalTokens: number,
  ): EmbeddingResponseMetadata {
    const metadata = new EmbeddingResponseMetadata();
    metadata.setModel(model);
    metadata.setUsage(this.getDefaultUsage(totalTokens));
    return metadata;
  }

  private getDefaultUsage(totalTokens: number): DefaultUsage {
    return new DefaultUsage({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens,
    });
  }

  private extractEmbeddings(
    response: EmbedContentResponse,
  ): ContentEmbedding[] | null {
    return response.embeddings ?? null;
  }
}

function mergeOption<T>(
  runtimeValue: T | null | undefined,
  defaultValue: T,
): T {
  return runtimeValue ?? defaultValue;
}
