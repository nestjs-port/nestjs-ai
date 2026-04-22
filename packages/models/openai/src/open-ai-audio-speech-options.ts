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

import type { TextToSpeechOptions } from "@nestjs-ai/model";
import type { SpeechCreateParams } from "openai/resources/audio";

import {
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options";

export interface OpenAiAudioSpeechOptionsProps extends AbstractOpenAiOptionsProps {
  input?: string | null;
  voice?: string | null;
  responseFormat?: SpeechCreateParams["response_format"] | null;
  speed?: number | null;
}

/**
 * Configuration options for OpenAI text-to-speech using the OpenAI Java SDK.
 */
export class OpenAiAudioSpeechOptions
  extends AbstractOpenAiOptions
  implements TextToSpeechOptions
{
  static readonly DEFAULT_SPEECH_MODEL = "gpt-4o-mini-tts";
  static readonly DEFAULT_VOICE = "alloy";
  static readonly DEFAULT_RESPONSE_FORMAT: SpeechCreateParams["response_format"] =
    "mp3";
  static readonly DEFAULT_SPEED = 1.0;

  private _input: string | null = null;
  private _voice: string | null = null;
  private _responseFormat: SpeechCreateParams["response_format"] | null = null;
  private _speed: number | null = null;

  constructor(props: OpenAiAudioSpeechOptionsProps = {}) {
    super(props);
    this._input = props.input ?? null;
    this._voice = props.voice ?? null;
    this._responseFormat = props.responseFormat ?? null;
    this._speed = props.speed ?? null;
  }

  static builder(): OpenAiAudioSpeechOptions.Builder {
    return new OpenAiAudioSpeechOptions.Builder();
  }

  get input(): string | null {
    return this._input;
  }

  setInput(input: string | null): void {
    this._input = input ?? null;
  }

  get voice(): string | null {
    return this._voice;
  }

  setVoice(voice: string | null): void;
  setVoice(voice: OpenAiAudioSpeechOptions.Voice | null): void;
  setVoice(voice: string | OpenAiAudioSpeechOptions.Voice | null): void {
    this._voice = voice ?? null;
  }

  get responseFormat(): SpeechCreateParams["response_format"] | null {
    return this._responseFormat;
  }

  setResponseFormat(
    responseFormat: SpeechCreateParams["response_format"] | null,
  ): void {
    this._responseFormat = responseFormat ?? null;
  }

  get speed(): number | null {
    return this._speed;
  }

  setSpeed(speed: number | null): void {
    this._speed = speed ?? null;
  }

  get format(): string | null {
    return this._responseFormat != null
      ? this._responseFormat.toLowerCase()
      : null;
  }

  copy(): OpenAiAudioSpeechOptions {
    return OpenAiAudioSpeechOptions.builder().from(this).build();
  }
}

export namespace OpenAiAudioSpeechOptions {
  export enum Voice {
    ALLOY = "alloy",
    ECHO = "echo",
    FABLE = "fable",
    ONYX = "onyx",
    NOVA = "nova",
    SHIMMER = "shimmer",
    BALLAD = "ballad",
    SAGE = "sage",
    CORAL = "coral",
    VERSE = "verse",
    ASH = "ash",
  }

  export class Builder {
    private readonly options = new OpenAiAudioSpeechOptions();

    from(fromOptions: OpenAiAudioSpeechOptions): this {
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
      this.options.setCustomHeaders(fromOptions.customHeaders);
      this.options.setInput(fromOptions.input);
      this.options.setVoice(fromOptions.voice);
      this.options.setResponseFormat(fromOptions.responseFormat);
      this.options.setSpeed(fromOptions.speed);
      return this;
    }

    model(model: string | null): this {
      this.options.setModel(model);
      return this;
    }

    input(input: string | null): this {
      this.options.setInput(input);
      return this;
    }

    voice(voice: string | null): this;
    voice(voice: OpenAiAudioSpeechOptions.Voice | null): this;
    voice(voice: string | OpenAiAudioSpeechOptions.Voice | null): this {
      this.options.setVoice(voice);
      return this;
    }

    responseFormat(
      responseFormat: SpeechCreateParams["response_format"] | null,
    ): this {
      this.options.setResponseFormat(responseFormat);
      return this;
    }

    speed(speed: number | null): this {
      this.options.setSpeed(speed);
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

    timeout(timeout: OpenAiAudioSpeechOptionsProps["timeout"]): this {
      this.options.setTimeout(timeout ?? null);
      return this;
    }

    maxRetries(maxRetries: number | null): this {
      this.options.setMaxRetries(maxRetries);
      return this;
    }

    fetchOptions(
      fetchOptions: OpenAiAudioSpeechOptionsProps["fetchOptions"],
    ): this {
      this.options.setFetchOptions(fetchOptions ?? null);
      return this;
    }

    customHeaders(customHeaders: Record<string, string> | null): this {
      this.options.setCustomHeaders(customHeaders);
      return this;
    }

    build(): OpenAiAudioSpeechOptions {
      return this.options;
    }
  }
}
