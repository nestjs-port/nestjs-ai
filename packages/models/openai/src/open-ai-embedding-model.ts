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
import { AiProvider, type Document, MetadataMode } from "@nestjs-ai/commons";
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
import {
  LoggerFactory,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-port/core";
import type { OpenAI } from "openai";

import { OpenAiEmbeddingOptions } from "./open-ai-embedding-options";
import type { OpenAiClient } from "./open-ai-client";
import { OpenAiSetup, type OpenAiSetupProps } from "./setup";

type OpenAiEmbeddingResponse = Awaited<
  ReturnType<OpenAI["embeddings"]["create"]>
>;

export interface OpenAiEmbeddingModelProps {
  openAiClient?: OpenAiClient | null;
  metadataMode?: MetadataMode | null;
  options?: OpenAiEmbeddingOptions | null;
  observationRegistry?: ObservationRegistry | null;
}

export class OpenAiEmbeddingModel extends AbstractEmbeddingModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL;

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultEmbeddingModelObservationConvention();

  private readonly logger = LoggerFactory.getLogger(OpenAiEmbeddingModel.name);

  private readonly _openAiClient: OpenAiClient;
  private readonly _options: OpenAiEmbeddingOptions;
  private readonly _metadataMode: MetadataMode;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: EmbeddingModelObservationConvention =
    OpenAiEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiEmbeddingModelProps = {}) {
    super();
    this._options =
      props.options ??
      new OpenAiEmbeddingOptions({
        model: OpenAiEmbeddingModel.DEFAULT_MODEL_NAME,
      });
    this._openAiClient =
      props.openAiClient ??
      OpenAiSetup.setupClient(this.toSetupProps(this._options));
    this._metadataMode = props.metadataMode ?? MetadataMode.EMBED;
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  get options(): OpenAiEmbeddingOptions {
    return this._options;
  }

  get metadataMode(): MetadataMode {
    return this._metadataMode;
  }

  get observationRegistry(): ObservationRegistry {
    return this._observationRegistry;
  }

  get observationConvention(): EmbeddingModelObservationConvention {
    return this._observationConvention;
  }

  override getEmbeddingContent(document: Document): string {
    assert(document, "Document must not be null");
    return document.getFormattedContent(this._metadataMode);
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    assert(document, "Document must not be null");
    const response = await this.call(
      new EmbeddingRequest(
        [document.getFormattedContent(this._metadataMode)],
        null,
      ),
    );

    if (response.results.length === 0) {
      return [];
    }

    return response.results[0].output;
  }

  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const options = OpenAiEmbeddingOptions.builder()
      .from(this._options)
      .merge(request.options)
      .build();

    const requestWithMergedOptions = new EmbeddingRequest(
      request.instructions,
      options,
    );

    const embeddingCreateParams = options.toOpenAiCreateParams(
      requestWithMergedOptions.instructions,
    );

    if (this.logger.isTraceEnabled()) {
      this.logger.trace(
        `OpenAiEmbeddingModel call ${options.model} with the following options: ${JSON.stringify(embeddingCreateParams)}`,
      );
    }

    const observationContext = new EmbeddingModelObservationContext(
      requestWithMergedOptions,
      AiProvider.OPENAI.value,
    );

    return new EmbeddingModelObservationDocumentation()
      .observation(
        this._observationConvention,
        OpenAiEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      )
      .observe(async () => {
        const response = await this._openAiClient.embeddings.create(
          embeddingCreateParams,
        );

        const embeddingResponse = this.generateEmbeddingResponse(response);
        observationContext.setResponse(embeddingResponse);
        return embeddingResponse;
      });
  }

  setObservationConvention(
    observationConvention: EmbeddingModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  private generateEmbeddingResponse(
    response: OpenAiEmbeddingResponse,
  ): EmbeddingResponse {
    const data = this.generateEmbeddingList(response.data);
    const metadata = new EmbeddingResponseMetadata();
    metadata.setModel(response.model);
    metadata.setUsage(this.getDefaultUsage(response.usage));
    return new EmbeddingResponse(data, metadata);
  }

  private getDefaultUsage(
    nativeUsage: OpenAiEmbeddingResponse["usage"],
  ): DefaultUsage {
    return new DefaultUsage({
      promptTokens: nativeUsage.prompt_tokens,
      completionTokens: 0,
      totalTokens: nativeUsage.total_tokens,
      nativeUsage,
    });
  }

  private generateEmbeddingList(
    nativeData: OpenAiEmbeddingResponse["data"],
  ): Embedding[] {
    const data: Embedding[] = [];
    for (const nativeDatum of nativeData) {
      data.push(new Embedding(nativeDatum.embedding, nativeDatum.index));
    }
    return data;
  }

  private toSetupProps(options: OpenAiEmbeddingOptions): OpenAiSetupProps {
    return {
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      azureADTokenProvider: options.azureADTokenProvider,
      azureDeploymentName: options.deploymentName,
      azureOpenAiServiceVersion: options.microsoftFoundryServiceVersion,
      organizationId: options.organizationId,
      isAzure: options.microsoftFoundry,
      isGitHubModels: options.gitHubModels,
      modelName: options.model,
      timeout: options.timeout,
      maxRetries: options.maxRetries,
      fetchOptions: options.fetchOptions,
      customHeaders: options.customHeaders,
    };
  }
}
