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

import { LoggerFactory } from "@nestjs-port/core";
import type {
  Moderation as OpenAiModerationResult,
  ModerationCreateParams,
  ModerationCreateResponse,
} from "openai/resources/moderations";

import {
  Categories,
  CategoryScores,
  Moderation,
  ModerationGeneration,
  type ModerationModel,
  type ModerationOptions,
  type ModerationPrompt,
  ModerationResponse,
  ModerationResult,
} from "@nestjs-ai/model";

import { OpenAiSetup, type OpenAiSetupProps } from "./setup/index.js";
import {
  OpenAiModerationOptions,
  type OpenAiModerationOptionsProps,
} from "./open-ai-moderation-options.js";
import type { OpenAiClient } from "./open-ai-client.js";

export interface OpenAiModerationModelProps {
  openAiClient?: OpenAiClient | null;
  options?: OpenAiModerationOptions | null;
}

/**
 * OpenAI SDK Moderation Model implementation.
 *
 * This model provides content moderation capabilities using the OpenAI Moderation API
 * through the official OpenAI Java SDK.
 */
export class OpenAiModerationModel implements ModerationModel {
  private readonly logger = LoggerFactory.getLogger(OpenAiModerationModel.name);

  private readonly _openAiClient: OpenAiClient;
  private readonly _defaultOptions: OpenAiModerationOptions;

  constructor(props: OpenAiModerationModelProps = {}) {
    this._defaultOptions =
      props.options ??
      new OpenAiModerationOptions({
        model: OpenAiModerationOptions.DEFAULT_MODERATION_MODEL,
      });
    this._openAiClient =
      props.openAiClient ??
      OpenAiSetup.setupClient(this.toSetupProps(this._defaultOptions));
  }

  mutate(): OpenAiModerationModel {
    return new OpenAiModerationModel({
      openAiClient: this._openAiClient,
      options: this._defaultOptions,
    });
  }

  get options(): OpenAiModerationOptions {
    return this._defaultOptions;
  }

  async call(moderationPrompt: ModerationPrompt): Promise<ModerationResponse> {
    const text = moderationPrompt.instructions.text;
    const options = this.mergeOptions(
      moderationPrompt.options,
      this._defaultOptions,
    );
    const model = options.deploymentName ?? options.model;
    assert(model, "Model must not be null");

    const params: ModerationCreateParams = {
      input: text,
      model,
    };

    const response = await this._openAiClient.moderations.create(params);
    return this.convertResponse(response);
  }

  private convertResponse(
    response: ModerationCreateResponse | null,
  ): ModerationResponse {
    if (response == null) {
      this.logger.warn("No moderation response returned");
      return new ModerationResponse(null);
    }

    const moderationResults = response.results.map((result) =>
      this.toModerationResult(result),
    );

    const moderation = new Moderation({
      id: response.id,
      model: response.model,
      results: moderationResults,
    });

    return new ModerationResponse(new ModerationGeneration({ moderation }));
  }

  private toModerationResult(result: OpenAiModerationResult): ModerationResult {
    return new ModerationResult({
      categories: new Categories({
        sexual: result.categories.sexual,
        hate: result.categories.hate,
        harassment: result.categories.harassment,
        selfHarm: result.categories["self-harm"],
        sexualMinors: result.categories["sexual/minors"],
        hateThreatening: result.categories["hate/threatening"],
        violenceGraphic: result.categories["violence/graphic"],
        selfHarmIntent: result.categories["self-harm/intent"],
        selfHarmInstructions: result.categories["self-harm/instructions"],
        harassmentThreatening: result.categories["harassment/threatening"],
        violence: result.categories.violence,
      }),
      categoryScores: new CategoryScores({
        hate: result.category_scores.hate,
        hateThreatening: result.category_scores["hate/threatening"],
        harassment: result.category_scores.harassment,
        harassmentThreatening: result.category_scores["harassment/threatening"],
        selfHarm: result.category_scores["self-harm"],
        selfHarmIntent: result.category_scores["self-harm/intent"],
        selfHarmInstructions: result.category_scores["self-harm/instructions"],
        sexual: result.category_scores.sexual,
        sexualMinors: result.category_scores["sexual/minors"],
        violence: result.category_scores.violence,
        violenceGraphic: result.category_scores["violence/graphic"],
      }),
      flagged: result.flagged,
    });
  }

  private mergeOptions(
    source: ModerationOptions | null | undefined,
    target: OpenAiModerationOptions,
  ): OpenAiModerationOptions {
    const targetProps = this.toOpenAiModerationOptionsProps(target);

    if (source instanceof OpenAiModerationOptions) {
      return new OpenAiModerationOptions({
        ...targetProps,
        ...this.toOpenAiModerationOptionsProps(source),
      });
    }

    if (source?.model != null) {
      return new OpenAiModerationOptions({
        ...targetProps,
        model: source.model,
      });
    }

    return new OpenAiModerationOptions(targetProps);
  }

  private toOpenAiModerationOptionsProps(
    options: OpenAiModerationOptions,
  ): OpenAiModerationOptionsProps {
    return {
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      azureADTokenProvider: options.azureADTokenProvider,
      model: options.model,
      deploymentName: options.deploymentName,
      microsoftFoundryServiceVersion: options.microsoftFoundryServiceVersion,
      organizationId: options.organizationId,
      microsoftFoundry: options.microsoftFoundry,
      gitHubModels: options.gitHubModels,
      timeout: options.timeout ?? undefined,
      maxRetries: options.maxRetries,
      fetchOptions: options.fetchOptions,
      customHeaders: options.customHeaders,
    };
  }

  private toSetupProps(options: OpenAiModerationOptions): OpenAiSetupProps {
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
    } satisfies OpenAiSetupProps;
  }
}
