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

import {
  AiProvider,
  type Document,
  LoggerFactory,
  MetadataMode,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
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
import type { AzureOpenAI, OpenAI } from "openai";

import { OpenAiSdkEmbeddingOptions } from "./open-ai-sdk-embedding-options";
import { OpenAiSdkSetup, type OpenAiSdkSetupProps } from "./setup";

type OpenAiEmbeddingResponse = Awaited<
  ReturnType<OpenAI["embeddings"]["create"]>
>;

export interface OpenAiSdkEmbeddingModelProps {
  openAiClient?: OpenAI | AzureOpenAI | null;
  metadataMode?: MetadataMode | null;
  options?: OpenAiSdkEmbeddingOptions | null;
  observationRegistry?: ObservationRegistry | null;
}

export class OpenAiSdkEmbeddingModel extends AbstractEmbeddingModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiSdkEmbeddingOptions.DEFAULT_EMBEDDING_MODEL;

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultEmbeddingModelObservationConvention();

  private readonly logger = LoggerFactory.getLogger(
    OpenAiSdkEmbeddingModel.name,
  );

  private readonly _openAiClient: OpenAI | AzureOpenAI;
  private readonly _options: OpenAiSdkEmbeddingOptions;
  private readonly _metadataMode: MetadataMode;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: EmbeddingModelObservationConvention =
    OpenAiSdkEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiSdkEmbeddingModelProps = {}) {
    super();
    this._options =
      props.options ??
      new OpenAiSdkEmbeddingOptions({
        model: OpenAiSdkEmbeddingModel.DEFAULT_MODEL_NAME,
      });
    this._openAiClient =
      props.openAiClient ??
      OpenAiSdkSetup.setupClient(this.toSetupProps(this._options));
    this._metadataMode = props.metadataMode ?? MetadataMode.EMBED;
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  get options(): OpenAiSdkEmbeddingOptions {
    return this._options;
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
    const options = OpenAiSdkEmbeddingOptions.builder()
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
        `OpenAiSdkEmbeddingModel call ${options.model} with the following options: ${JSON.stringify(embeddingCreateParams)}`,
      );
    }

    const observationContext = new EmbeddingModelObservationContext(
      requestWithMergedOptions,
      AiProvider.OPENAI_SDK.value,
    );

    return new EmbeddingModelObservationDocumentation()
      .observation(
        this._observationConvention,
        OpenAiSdkEmbeddingModel.DEFAULT_OBSERVATION_CONVENTION,
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

  private toSetupProps(
    options: OpenAiSdkEmbeddingOptions,
  ): OpenAiSdkSetupProps {
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
