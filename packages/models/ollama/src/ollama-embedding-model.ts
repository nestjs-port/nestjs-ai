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

import type { Document } from "@nestjs-ai/commons";
import {
  AbstractEmbeddingModel,
  DefaultEmbeddingModelObservationConvention,
  DefaultUsage,
  Embedding,
  type EmbeddingOptions,
  EmbeddingModelObservationContext,
  type EmbeddingModelObservationConvention,
  EmbeddingModelObservationDocumentation,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResponseMetadata,
} from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
  StringUtils,
} from "@nestjs-port/core";

import type { OllamaApi } from "./api/ollama-api.js";
import { OllamaEmbeddingOptions } from "./api/ollama-embedding-options.js";
import { OllamaModel } from "./api/ollama-model.js";
import { OllamaApiConstants } from "./api/common/ollama-api-constants.js";
import { ModelManagementOptions } from "./management/model-management-options.js";
import { OllamaModelManager } from "./management/ollama-model-manager.js";
import { PullModelStrategy } from "./management/pull-model-strategy.js";

export interface OllamaEmbeddingModelProps {
  ollamaApi: OllamaApi;
  defaultOptions?: OllamaEmbeddingOptions | null;
  observationRegistry?: ObservationRegistry | null;
  modelManagementOptions?: ModelManagementOptions | null;
}

/**
 * Embedding Model implementation for Ollama.
 */
export class OllamaEmbeddingModel extends AbstractEmbeddingModel {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultEmbeddingModelObservationConvention();

  private readonly _ollamaApi: OllamaApi;

  private readonly _defaultOptions: OllamaEmbeddingOptions;

  private readonly _observationRegistry: ObservationRegistry;

  private readonly _modelManager: OllamaModelManager;

  private readonly _initializePromise: Promise<void>;

  private _observationConvention: EmbeddingModelObservationConvention =
    OllamaEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OllamaEmbeddingModelProps) {
    super();
    assert(props.ollamaApi, "ollamaApi must not be null");

    this._ollamaApi = props.ollamaApi;
    this._defaultOptions =
      props.defaultOptions ??
      new OllamaEmbeddingOptions({
        model: OllamaModel.MXBAI_EMBED_LARGE.id(),
      });
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;

    const modelManagementOptions =
      props.modelManagementOptions ?? ModelManagementOptions.defaults();
    this._modelManager = new OllamaModelManager({
      ollamaApi: this._ollamaApi,
      options: modelManagementOptions,
    });

    const model = this._defaultOptions.model;
    assert(model != null, "model must not be null");
    this._initializePromise = this.initializeModel(
      model,
      modelManagementOptions.pullModelStrategy,
    );
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    const text = document.text;
    assert(text != null, "text must not be null");
    return this.embed(text);
  }

  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    assert(request.instructions.length > 0, "At least one text is required!");

    await this._initializePromise;

    // Before moving any further, build the final request EmbeddingRequest,
    // merging runtime and default options.
    const embeddingRequest = this.buildEmbeddingRequest(request);

    const ollamaEmbeddingRequest =
      this.ollamaEmbeddingRequest(embeddingRequest);

    const observationContext = new EmbeddingModelObservationContext(
      request,
      OllamaApiConstants.PROVIDER_NAME,
    );

    return new EmbeddingModelObservationDocumentation()
      .observation(
        this._observationConvention,
        OllamaEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      )
      .observe(async () => {
        const response = await this._ollamaApi.embed(ollamaEmbeddingRequest);

        const embeddings = response.embeddings.map(
          (embedding, index) => new Embedding(embedding, index),
        );

        const embeddingResponse = new EmbeddingResponse(
          embeddings,
          new EmbeddingResponseMetadata(
            response.model,
            this.getDefaultUsage(response),
          ),
        );

        observationContext.setResponse(embeddingResponse);
        return embeddingResponse;
      });
  }

  buildEmbeddingRequest(embeddingRequest: EmbeddingRequest): EmbeddingRequest {
    const requestOptions = this.mergeOptions(embeddingRequest.options);

    // Validate request options
    if (!StringUtils.hasText(requestOptions.model)) {
      throw new Error("model cannot be null or empty");
    }

    return new EmbeddingRequest(embeddingRequest.instructions, requestOptions);
  }

  ollamaEmbeddingRequest(
    embeddingRequest: EmbeddingRequest,
  ): OllamaApi.EmbeddingsRequest {
    assert(
      embeddingRequest.options instanceof OllamaEmbeddingOptions,
      "requestOptions must not be null",
    );

    const requestOptions = embeddingRequest.options;
    const model = requestOptions.model;
    assert(model != null, "model must not be null");

    return {
      model,
      input: embeddingRequest.instructions,
      keep_alive: requestOptions.keepAlive,
      options: OllamaEmbeddingOptions.filterNonSupportedFields(
        requestOptions.toMap(),
      ),
      truncate: requestOptions.truncate,
      dimensions: requestOptions.dimensions,
    };
  }

  setObservationConvention(
    observationConvention: EmbeddingModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  private getDefaultUsage(
    response: OllamaApi.EmbeddingsResponse,
  ): DefaultUsage {
    return new DefaultUsage({
      promptTokens: response.prompt_eval_count ?? 0,
      completionTokens: 0,
      nativeUsage: response,
    });
  }

  private mergeOptions(
    requestOptions: EmbeddingOptions | null,
  ): OllamaEmbeddingOptions {
    const options = this._defaultOptions;

    if (requestOptions == null) {
      return options;
    }

    const builderProps = {
      model: mergeOption(requestOptions.model, options.model),
      dimensions: mergeOption(requestOptions.dimensions, options.dimensions),
    };

    if (requestOptions instanceof OllamaEmbeddingOptions) {
      return new OllamaEmbeddingOptions({
        ...builderProps,
        keepAlive: mergeOption(requestOptions.keepAlive, options.keepAlive),
        truncate: mergeOption(requestOptions.truncate, options.truncate),
        useNUMA: mergeOption(requestOptions.useNUMA, options.useNUMA),
        numBatch: mergeOption(requestOptions.numBatch, options.numBatch),
        numGPU: mergeOption(requestOptions.numGPU, options.numGPU),
        mainGPU: mergeOption(requestOptions.mainGPU, options.mainGPU),
        lowVRAM: mergeOption(requestOptions.lowVRAM, options.lowVRAM),
        vocabOnly: mergeOption(requestOptions.vocabOnly, options.vocabOnly),
        useMMap: mergeOption(requestOptions.useMMap, options.useMMap),
        useMLock: mergeOption(requestOptions.useMLock, options.useMLock),
        numThread: mergeOption(requestOptions.numThread, options.numThread),
      });
    }

    return new OllamaEmbeddingOptions(builderProps);
  }

  private async initializeModel(
    model: string,
    pullModelStrategy: PullModelStrategy,
  ): Promise<void> {
    if (pullModelStrategy !== PullModelStrategy.NEVER) {
      await this._modelManager.pullModel(model, pullModelStrategy);
    }
  }
}

function mergeOption<T>(
  runtimeValue: T | null | undefined,
  defaultValue: T,
): T {
  return runtimeValue ?? defaultValue;
}
