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
import { from, type Observable } from "rxjs";
import type { SpeechCreateParams } from "openai/resources/audio";
import { LoggerFactory, StringUtils } from "@nestjs-port/core";
import {
  Speech,
  TextToSpeechModel,
  type TextToSpeechOptions,
  TextToSpeechPrompt,
  TextToSpeechResponse,
} from "@nestjs-ai/model";

import {
  OpenAiAudioSpeechOptions,
  type OpenAiAudioSpeechOptionsProps,
} from "./open-ai-audio-speech-options.js";
import type { OpenAiClient } from "./open-ai-client.js";
import { OpenAiAudioSpeechResponseMetadata } from "./metadata/index.js";
import { OpenAiSetup, type OpenAiSetupProps } from "./setup/index.js";

export interface OpenAiAudioSpeechModelProps {
  openAiClient?: OpenAiClient | null;
  options?: OpenAiAudioSpeechOptions | null;
}

/**
 * OpenAI audio speech client implementation using the OpenAI Java SDK.
 */
export class OpenAiAudioSpeechModel extends TextToSpeechModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiAudioSpeechOptions.DEFAULT_SPEECH_MODEL;

  private static readonly DEFAULT_SPEED = 1.0;

  private readonly logger = LoggerFactory.getLogger(
    OpenAiAudioSpeechModel.name,
  );

  private readonly _openAiClient: OpenAiClient;
  private readonly _defaultOptions: OpenAiAudioSpeechOptions;

  constructor(props: OpenAiAudioSpeechModelProps = {}) {
    super();
    this._defaultOptions =
      props.options ??
      new OpenAiAudioSpeechOptions({
        model: OpenAiAudioSpeechModel.DEFAULT_MODEL_NAME,
        voice: OpenAiAudioSpeechOptions.DEFAULT_VOICE,
        responseFormat: OpenAiAudioSpeechOptions.DEFAULT_RESPONSE_FORMAT,
        speed: OpenAiAudioSpeechModel.DEFAULT_SPEED,
      });
    this._openAiClient =
      props.openAiClient ??
      OpenAiSetup.setupClient(this.toSetupProps(this._defaultOptions));
  }

  override get defaultOptions(): TextToSpeechOptions {
    return this._defaultOptions;
  }

  override call(text: string): Promise<Uint8Array>;
  override call(prompt: TextToSpeechPrompt): Promise<TextToSpeechResponse>;
  override async call(
    promptOrText: TextToSpeechPrompt | string,
  ): Promise<TextToSpeechResponse | Uint8Array> {
    if (typeof promptOrText === "string") {
      assert(promptOrText.trim().length > 0, "Text must not be null or empty");
      const prompt = new TextToSpeechPrompt({ text: promptOrText });
      const result = (await this.callPrompt(prompt)).result;
      assert(result != null, "TextToSpeechResponse must not be null");
      return result.output;
    }

    return this.callPrompt(promptOrText);
  }

  protected override async callPrompt(
    prompt: TextToSpeechPrompt,
  ): Promise<TextToSpeechResponse> {
    assert(prompt, "Prompt must not be null");

    const mergedOptions = this.mergeOptions(prompt);
    const inputText = this.getInputText(prompt, mergedOptions);

    if (this.logger.isTraceEnabled()) {
      this.logger.trace(
        `Calling OpenAI SDK audio speech with model: ${mergedOptions.deploymentName ?? mergedOptions.model}, voice: ${mergedOptions.voice}, format: ${mergedOptions.responseFormat}, speed: ${mergedOptions.speed}`,
      );
    }

    const model = mergedOptions.deploymentName ?? mergedOptions.model;
    assert(model, "Model must not be null");
    assert(mergedOptions.voice, "Voice must not be null");

    const params = this.toSpeechCreateParams(mergedOptions, inputText, model);
    const speechResponse = await this._openAiClient.audio.speech.create(params);
    const audioBytes = new Uint8Array(await speechResponse.arrayBuffer());

    if (audioBytes.length === 0) {
      this.logger.warn("No speech response returned for prompt: {}", prompt);
      return new TextToSpeechResponse({
        results: [new Speech(new Uint8Array(0))],
      });
    }

    const metadata = OpenAiAudioSpeechResponseMetadata.from(
      speechResponse.headers,
    );
    return new TextToSpeechResponse({
      results: [new Speech(audioBytes)],
      metadata,
    });
  }

  protected override streamPrompt(
    prompt: TextToSpeechPrompt,
  ): Observable<TextToSpeechResponse> {
    return from(this.callPrompt(prompt));
  }

  private mergeOptions(prompt: TextToSpeechPrompt): OpenAiAudioSpeechOptions {
    const runtimeOptions =
      prompt.options instanceof OpenAiAudioSpeechOptions
        ? prompt.options
        : null;

    if (runtimeOptions != null) {
      return new OpenAiAudioSpeechOptions(
        this.mergeProps(runtimeOptions, this._defaultOptions),
      );
    }

    return this._defaultOptions;
  }

  private mergeProps(
    source: OpenAiAudioSpeechOptions,
    target: OpenAiAudioSpeechOptions,
  ): OpenAiAudioSpeechOptionsProps {
    return {
      baseUrl: source.baseUrl != null ? source.baseUrl : target.baseUrl,
      apiKey: source.apiKey != null ? source.apiKey : target.apiKey,
      azureADTokenProvider:
        source.azureADTokenProvider != null
          ? source.azureADTokenProvider
          : target.azureADTokenProvider,
      model: source.model != null ? source.model : target.model,
      deploymentName:
        source.deploymentName != null
          ? source.deploymentName
          : target.deploymentName,
      microsoftFoundryServiceVersion:
        source.microsoftFoundryServiceVersion != null
          ? source.microsoftFoundryServiceVersion
          : target.microsoftFoundryServiceVersion,
      organizationId:
        source.organizationId != null
          ? source.organizationId
          : target.organizationId,
      microsoftFoundry: source.microsoftFoundry || target.microsoftFoundry,
      gitHubModels: source.gitHubModels || target.gitHubModels,
      timeout: source.timeout ?? undefined,
      maxRetries: source.maxRetries,
      fetchOptions:
        source.fetchOptions != null ? source.fetchOptions : target.fetchOptions,
      customHeaders:
        source.customHeaders != null
          ? source.customHeaders
          : target.customHeaders,
      input: source.input != null ? source.input : target.input,
      voice: source.voice != null ? source.voice : target.voice,
      responseFormat:
        source.responseFormat != null
          ? source.responseFormat
          : target.responseFormat,
      speed: source.speed != null ? source.speed : target.speed,
    };
  }

  private getInputText(
    prompt: TextToSpeechPrompt,
    options: OpenAiAudioSpeechOptions,
  ): string {
    if (StringUtils.hasText(options.input)) {
      return options.input;
    }
    return prompt.instructions.text ?? "";
  }

  private toSpeechCreateParams(
    options: OpenAiAudioSpeechOptions,
    inputText: string,
    model: string,
  ): SpeechCreateParams {
    return {
      model,
      input: inputText,
      voice: options.voice!,
      ...(options.responseFormat != null
        ? { response_format: options.responseFormat }
        : {}),
      ...(options.speed != null ? { speed: options.speed } : {}),
    };
  }

  private toSetupProps(options: OpenAiAudioSpeechOptions): OpenAiSetupProps {
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
