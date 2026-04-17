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
  LoggerFactory,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  DefaultImageModelObservationConvention,
  Image,
  ImageGeneration,
  type ImageModel,
  ImageModelObservationContext,
  type ImageModelObservationConvention,
  ImageModelObservationDocumentation,
  type ImagePrompt,
  ImageResponse,
} from "@nestjs-ai/model";
import type { AzureOpenAI, OpenAI } from "openai";

import {
  OpenAiSdkImageGenerationMetadata,
  OpenAiSdkImageResponseMetadata,
} from "./metadata";
import { OpenAiSdkImageOptions } from "./open-ai-sdk-image-options";
import { OpenAiSdkSetup, type OpenAiSdkSetupProps } from "./setup";

export interface OpenAiSdkImageModelProps {
  openAiClient?: OpenAI | AzureOpenAI | null;
  options?: OpenAiSdkImageOptions | null;
  observationRegistry?: ObservationRegistry | null;
}

export class OpenAiSdkImageModel implements ImageModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiSdkImageOptions.DEFAULT_IMAGE_MODEL;

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultImageModelObservationConvention();

  private readonly logger = LoggerFactory.getLogger(OpenAiSdkImageModel.name);

  private readonly _openAiClient: OpenAI | AzureOpenAI;
  private readonly _options: OpenAiSdkImageOptions;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: ImageModelObservationConvention =
    OpenAiSdkImageModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiSdkImageModelProps = {}) {
    this._options =
      props.options ??
      new OpenAiSdkImageOptions({
        model: OpenAiSdkImageModel.DEFAULT_MODEL_NAME,
      });

    this._openAiClient =
      props.openAiClient ??
      OpenAiSdkSetup.setupClient(this.toSetupProps(this._options));
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  get options(): OpenAiSdkImageOptions {
    return this._options;
  }

  async call(imagePrompt: ImagePrompt): Promise<ImageResponse> {
    const options = OpenAiSdkImageOptions.builder()
      .from(this._options)
      .merge(imagePrompt.options)
      .build();

    const imageGenerateParams =
      options.toOpenAiImageGenerateParams(imagePrompt);

    if (this.logger.isTraceEnabled()) {
      this.logger.trace(
        `OpenAiSdkImageOptions call ${options.model} with the following options: ${JSON.stringify(imageGenerateParams)}`,
      );
    }

    const observationContext = new ImageModelObservationContext(
      imagePrompt,
      AiProvider.OPENAI_SDK.value,
    );

    return new ImageModelObservationDocumentation()
      .observation(
        this._observationConvention,
        OpenAiSdkImageModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      )
      .observe(async () => {
        const images =
          await this._openAiClient.images.generate(imageGenerateParams);

        if (images.data == null || images.data.length === 0) {
          throw new Error("Image generation failed: no image returned");
        }

        const imageGenerations = images.data.map((nativeImage) => {
          let image: Image;
          if (nativeImage.url != null) {
            image = new Image({ url: nativeImage.url, b64Json: null });
          } else if (nativeImage.b64_json != null) {
            image = new Image({ url: null, b64Json: nativeImage.b64_json });
          } else {
            throw new Error(
              "Image generation failed: image entry missing url and b64_json",
            );
          }

          const metadata = new OpenAiSdkImageGenerationMetadata(
            nativeImage.revised_prompt,
          );
          return new ImageGeneration({
            image,
            imageGenerationMetadata: metadata,
          });
        });

        const imageResponseMetadata =
          OpenAiSdkImageResponseMetadata.from(images);
        const imageResponse = new ImageResponse({
          generations: imageGenerations,
          imageResponseMetadata,
        });
        observationContext.setResponse(imageResponse);
        return imageResponse;
      });
  }

  setObservationConvention(
    observationConvention: ImageModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  private toSetupProps(options: OpenAiSdkImageOptions): OpenAiSdkSetupProps {
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
