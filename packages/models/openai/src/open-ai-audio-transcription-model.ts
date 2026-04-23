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
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { LoggerFactory } from "@nestjs-port/core";
import {
  AudioTranscription,
  AudioTranscriptionPrompt,
  AudioTranscriptionResponse,
  AudioTranscriptionResponseMetadata,
  TranscriptionModel,
} from "@nestjs-ai/model";
import type { TranscriptionCreateParamsNonStreaming } from "openai/resources/audio/transcriptions";
import { toFile } from "openai";

import { OpenAiSetup, type OpenAiSetupProps } from "./setup";
import type { OpenAiClient } from "./open-ai-client";
import { OpenAiAudioTranscriptionOptions } from "./open-ai-audio-transcription-options";
import { readFile } from "node:fs/promises";

export interface OpenAiAudioTranscriptionModelProps {
  openAiClient?: OpenAiClient | null;
  options?: OpenAiAudioTranscriptionOptions | null;
}

/**
 * OpenAI audio transcription model implementation using the OpenAI Java SDK. You provide
 * as input the audio file you want to transcribe and the desired output file format of
 * the transcription of the audio.
 */
export class OpenAiAudioTranscriptionModel extends TranscriptionModel {
  private readonly logger = LoggerFactory.getLogger(
    OpenAiAudioTranscriptionModel.name,
  );

  private readonly _openAiClient: OpenAiClient;
  private readonly _defaultOptions: OpenAiAudioTranscriptionOptions;

  constructor(props: OpenAiAudioTranscriptionModelProps = {}) {
    super();
    this._defaultOptions =
      props.options ??
      new OpenAiAudioTranscriptionOptions({
        model: OpenAiAudioTranscriptionOptions.DEFAULT_TRANSCRIPTION_MODEL,
      });
    this._openAiClient =
      props.openAiClient ??
      OpenAiSetup.setupClient(this.toSetupProps(this._defaultOptions));
  }

  /**
   * Gets the transcription options for this model.
   * @returns the transcription options
   */
  get defaultOptions(): OpenAiAudioTranscriptionOptions {
    return this._defaultOptions;
  }

  get openAiClient(): OpenAiClient {
    return this._openAiClient;
  }

  override async call(
    transcriptionPrompt: AudioTranscriptionPrompt,
  ): Promise<AudioTranscriptionResponse> {
    assert(transcriptionPrompt, "Prompt must not be null");

    let options = this._defaultOptions;
    const promptOptions = transcriptionPrompt.options;
    if (promptOptions != null) {
      if (promptOptions instanceof OpenAiAudioTranscriptionOptions) {
        options = this.mergeOptions(promptOptions, options);
      } else {
        const optionName = promptOptions.constructor?.name ?? "unknown";
        throw new Error(
          `Prompt options are not of type OpenAiAudioTranscriptionOptions: ${optionName}`,
        );
      }
    }
    const audioBytes = await this.toBytes(transcriptionPrompt.instructions);
    const filename = this.getFilename(transcriptionPrompt.instructions);
    const params = await this.buildParams(options, audioBytes, filename);

    if (this.logger.isTraceEnabled()) {
      this.logger.trace(
        `OpenAiAudioTranscriptionModel call with model: ${options.model}`,
      );
    }

    const response =
      await this._openAiClient.audio.transcriptions.create(params);

    const transcript = new AudioTranscription(this.extractText(response));
    return new AudioTranscriptionResponse(
      transcript,
      new AudioTranscriptionResponseMetadata(),
    );
  }

  private async buildParams(
    options: OpenAiAudioTranscriptionOptions,
    audioBytes: Uint8Array,
    filename: string,
  ): Promise<TranscriptionCreateParamsNonStreaming> {
    const file = await toFile(audioBytes, filename);
    const model =
      options.deploymentName ??
      options.model ??
      OpenAiAudioTranscriptionOptions.DEFAULT_TRANSCRIPTION_MODEL;
    assert(model, "Model must not be null");

    return {
      file,
      model,
      ...(options.responseFormat != null
        ? { response_format: options.responseFormat }
        : {}),
      ...(options.language != null ? { language: options.language } : {}),
      ...(options.prompt != null ? { prompt: options.prompt } : {}),
      ...(options.temperature != null
        ? { temperature: options.temperature }
        : {}),
      ...(options.timestampGranularities != null &&
      options.timestampGranularities.length > 0
        ? { timestamp_granularities: options.timestampGranularities }
        : {}),
    };
  }

  private async toBytes(resource: string | URL | Buffer): Promise<Uint8Array> {
    assert(resource != null, "Resource must not be null");

    try {
      if (Buffer.isBuffer(resource)) {
        return resource;
      }

      return readFile(resource);
    } catch (error) {
      throw new Error(`Failed to read resource: ${String(resource)}`, {
        cause: error,
      });
    }
  }

  private getFilename(resource: string | URL | Buffer): string {
    if (resource instanceof URL) {
      const filename = basename(fileURLToPath(resource));
      return filename.length > 0 ? filename : "audio";
    }

    if (typeof resource === "string") {
      const filename = basename(resource);
      if (filename.length > 0 && filename !== "." && filename !== "/") {
        return filename;
      }
    }

    return "audio";
  }

  private mergeOptions(
    source: OpenAiAudioTranscriptionOptions | null,
    target: OpenAiAudioTranscriptionOptions,
  ): OpenAiAudioTranscriptionOptions {
    if (source == null) {
      return target;
    }

    return OpenAiAudioTranscriptionOptions.builder()
      .from(target)
      .merge(source)
      .build();
  }

  private extractText(response: string | { text: string }): string {
    if (typeof response === "string") {
      return response;
    }

    return response.text;
  }

  private toSetupProps(
    options: OpenAiAudioTranscriptionOptions,
  ): OpenAiSetupProps {
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
