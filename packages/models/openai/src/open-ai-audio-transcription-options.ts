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

import type { Milliseconds } from "@nestjs-port/core";
import type { AudioTranscriptionOptions } from "@nestjs-ai/model";
import type { TranscriptionCreateParams } from "openai/resources/audio/transcriptions";

import {
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options";

export interface OpenAiAudioTranscriptionOptionsProps extends AbstractOpenAiOptionsProps {
  model?: string | null;
  responseFormat?: NonNullable<
    TranscriptionCreateParams["response_format"]
  > | null;
  prompt?: string | null;
  language?: string | null;
  temperature?: number | null;
  timestampGranularities?: NonNullable<
    TranscriptionCreateParams["timestamp_granularities"]
  > | null;
}

/**
 * OpenAI SDK Audio Transcription Options.
 */
export class OpenAiAudioTranscriptionOptions
  extends AbstractOpenAiOptions
  implements AudioTranscriptionOptions
{
  static readonly DEFAULT_TRANSCRIPTION_MODEL = "whisper-1";
  static readonly DEFAULT_RESPONSE_FORMAT = "text" as NonNullable<
    TranscriptionCreateParams["response_format"]
  >;

  private _transcriptionModel: string | null = null;
  private _responseFormat: NonNullable<
    TranscriptionCreateParams["response_format"]
  > = OpenAiAudioTranscriptionOptions.DEFAULT_RESPONSE_FORMAT;
  private _prompt: string | null = null;
  private _language: string | null = null;
  private _temperature: number | null = null;
  private _timestampGranularities: NonNullable<
    TranscriptionCreateParams["timestamp_granularities"]
  > | null = null;

  constructor(props: OpenAiAudioTranscriptionOptionsProps = {}) {
    super(props);
    this._transcriptionModel = props.model ?? null;
    this._responseFormat =
      props.responseFormat ??
      OpenAiAudioTranscriptionOptions.DEFAULT_RESPONSE_FORMAT;
    this._prompt = props.prompt ?? null;
    this._language = props.language ?? null;
    this._temperature = props.temperature ?? null;
    this._timestampGranularities = props.timestampGranularities ?? null;
  }

  static builder(): OpenAiAudioTranscriptionOptions.Builder {
    return new OpenAiAudioTranscriptionOptions.Builder();
  }

  get model(): string {
    return (
      this._transcriptionModel ??
      OpenAiAudioTranscriptionOptions.DEFAULT_TRANSCRIPTION_MODEL
    );
  }

  setModel(model: string | null): void {
    this._transcriptionModel = model ?? null;
  }

  get responseFormat(): NonNullable<
    TranscriptionCreateParams["response_format"]
  > {
    return this._responseFormat;
  }

  setResponseFormat(
    responseFormat: NonNullable<TranscriptionCreateParams["response_format"]>,
  ): void {
    this._responseFormat = responseFormat;
  }

  get prompt(): string | null {
    return this._prompt;
  }

  setPrompt(prompt: string | null): void {
    this._prompt = prompt ?? null;
  }

  get language(): string | null {
    return this._language;
  }

  setLanguage(language: string | null): void {
    this._language = language ?? null;
  }

  get temperature(): number | null {
    return this._temperature;
  }

  setTemperature(temperature: number | null): void {
    this._temperature = temperature ?? null;
  }

  get timestampGranularities(): NonNullable<
    TranscriptionCreateParams["timestamp_granularities"]
  > | null {
    return this._timestampGranularities;
  }

  setTimestampGranularities(
    timestampGranularities: NonNullable<
      TranscriptionCreateParams["timestamp_granularities"]
    > | null,
  ): void {
    this._timestampGranularities = timestampGranularities;
  }

  copy(): OpenAiAudioTranscriptionOptions {
    return OpenAiAudioTranscriptionOptions.builder().from(this).build();
  }

  equals(other: unknown): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof OpenAiAudioTranscriptionOptions)) {
      return false;
    }

    return (
      this._transcriptionModel === other._transcriptionModel &&
      this._responseFormat === other._responseFormat &&
      this._prompt === other._prompt &&
      this._language === other._language &&
      this._temperature === other._temperature &&
      arrayEquals(this._timestampGranularities, other._timestampGranularities)
    );
  }

  hashCode(): number {
    return hashValues(
      this._transcriptionModel,
      this._responseFormat,
      this._prompt,
      this._language,
      this._temperature,
      this._timestampGranularities,
    );
  }

  toString(): string {
    return (
      "OpenAiAudioTranscriptionOptions{" +
      `model='${this._transcriptionModel}', ` +
      `responseFormat=${String(this._responseFormat)}, ` +
      `prompt='${this._prompt}', ` +
      `language='${this._language}', ` +
      `temperature=${this._temperature}, ` +
      `timestampGranularities=${formatArray(this._timestampGranularities)}` +
      "}"
    );
  }
}

export namespace OpenAiAudioTranscriptionOptions {
  export class Builder {
    private readonly options = new OpenAiAudioTranscriptionOptions();

    from(fromOptions: OpenAiAudioTranscriptionOptions): this {
      this.options.setBaseUrl(fromOptions.baseUrl);
      this.options.setApiKey(fromOptions.apiKey);
      this.options.setAzureADTokenProvider(fromOptions.azureADTokenProvider);
      this.options.setModel(fromOptions.model);
      this.options.setDeploymentName(fromOptions.deploymentName);
      this.options.setMicrosoftFoundryServiceVersion(
        fromOptions.microsoftFoundryServiceVersion,
      );
      this.options.setOrganizationId(fromOptions.organizationId);
      this.options.setMicrosoftFoundry(fromOptions.microsoftFoundry);
      this.options.setGitHubModels(fromOptions.gitHubModels);
      this.options.setTimeout(fromOptions.timeout);
      this.options.setMaxRetries(fromOptions.maxRetries);
      this.options.setFetchOptions(fromOptions.fetchOptions);
      this.options.setCustomHeaders({ ...fromOptions.customHeaders });
      this.options.setResponseFormat(fromOptions.responseFormat);
      this.options.setPrompt(fromOptions.prompt);
      this.options.setLanguage(fromOptions.language);
      this.options.setTemperature(fromOptions.temperature);
      this.options.setTimestampGranularities(
        fromOptions.timestampGranularities,
      );
      return this;
    }

    merge(from: AudioTranscriptionOptions | null | undefined): this {
      if (from == null) {
        return this;
      }
      if (from.model != null) {
        this.options.setModel(from.model);
      }
      if (from instanceof OpenAiAudioTranscriptionOptions) {
        if (from.baseUrl != null) {
          this.options.setBaseUrl(from.baseUrl);
        }
        if (from.apiKey != null) {
          this.options.setApiKey(from.apiKey);
        }
        if (from.azureADTokenProvider != null) {
          this.options.setAzureADTokenProvider(from.azureADTokenProvider);
        }
        if (from.deploymentName != null) {
          this.options.setDeploymentName(from.deploymentName);
        }
        if (from.microsoftFoundryServiceVersion != null) {
          this.options.setMicrosoftFoundryServiceVersion(
            from.microsoftFoundryServiceVersion,
          );
        }
        if (from.organizationId != null) {
          this.options.setOrganizationId(from.organizationId);
        }
        this.options.setMicrosoftFoundry(from.microsoftFoundry);
        this.options.setGitHubModels(from.gitHubModels);
        if (from.timeout != null) {
          this.options.setTimeout(from.timeout);
        }
        if (from.maxRetries != null) {
          this.options.setMaxRetries(from.maxRetries);
        }
        if (from.fetchOptions != null) {
          this.options.setFetchOptions(from.fetchOptions);
        }
        this.options.setCustomHeaders({ ...from.customHeaders });
        this.options.setResponseFormat(from.responseFormat);
        if (from.prompt != null) {
          this.options.setPrompt(from.prompt);
        }
        if (from.language != null) {
          this.options.setLanguage(from.language);
        }
        if (from.temperature != null) {
          this.options.setTemperature(from.temperature);
        }
        if (from.timestampGranularities != null) {
          this.options.setTimestampGranularities(from.timestampGranularities);
        }
      }
      return this;
    }

    model(model: string | null): this {
      this.options.setModel(model);
      return this;
    }

    responseFormat(
      responseFormat: NonNullable<TranscriptionCreateParams["response_format"]>,
    ): this {
      this.options.setResponseFormat(responseFormat);
      return this;
    }

    prompt(prompt: string | null): this {
      this.options.setPrompt(prompt);
      return this;
    }

    language(language: string | null): this {
      this.options.setLanguage(language);
      return this;
    }

    temperature(temperature: number | null): this {
      this.options.setTemperature(temperature);
      return this;
    }

    timestampGranularities(
      timestampGranularities: NonNullable<
        TranscriptionCreateParams["timestamp_granularities"]
      > | null,
    ): this {
      this.options.setTimestampGranularities(timestampGranularities);
      return this;
    }

    baseUrl(baseUrl: string | null): this {
      this.options.setBaseUrl(baseUrl);
      return this;
    }

    apiKey(apiKey: string | null): this {
      this.options.setApiKey(apiKey);
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this.options.setAzureADTokenProvider(azureADTokenProvider);
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this.options.setMicrosoftFoundryServiceVersion(azureOpenAIServiceVersion);
      return this;
    }

    organizationId(organizationId: string | null): this {
      this.options.setOrganizationId(organizationId);
      return this;
    }

    azure(azure: boolean): this {
      this.options.setMicrosoftFoundry(azure);
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this.options.setGitHubModels(gitHubModels);
      return this;
    }

    timeout(timeout: Milliseconds | null): this {
      this.options.setTimeout(timeout);
      return this;
    }

    maxRetries(maxRetries: number | null): this {
      this.options.setMaxRetries(maxRetries);
      return this;
    }

    fetchOptions(
      fetchOptions: OpenAiAudioTranscriptionOptionsProps["fetchOptions"],
    ): this {
      this.options.setFetchOptions(fetchOptions ?? null);
      return this;
    }

    customHeaders(customHeaders: Record<string, string> | null): this {
      this.options.setCustomHeaders(
        customHeaders != null ? { ...customHeaders } : null,
      );
      return this;
    }

    build(): OpenAiAudioTranscriptionOptions {
      return this.options;
    }
  }
}

function arrayEquals(
  left: ReadonlyArray<unknown> | null,
  right: ReadonlyArray<unknown> | null,
): boolean {
  if (left === right) {
    return true;
  }
  if (left == null || right == null || left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function formatArray(values: ReadonlyArray<unknown> | null): string {
  return values == null
    ? "null"
    : `[${values.map((value) => String(value)).join(", ")}]`;
}

function hashValues(...values: unknown[]): number {
  let hash = 17;
  for (const value of values) {
    hash = (hash * 31 + hashValue(value)) | 0;
  }
  return hash;
}

function hashValue(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value | 0 : 0;
  }
  if (typeof value === "string") {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = (hash * 31 + value.charCodeAt(index)) | 0;
    }
    return hash;
  }
  if (Array.isArray(value)) {
    let hash = 1;
    for (const entry of value) {
      hash = (hash * 31 + hashValue(entry)) | 0;
    }
    return hash;
  }
  return hashValue(String(value));
}
