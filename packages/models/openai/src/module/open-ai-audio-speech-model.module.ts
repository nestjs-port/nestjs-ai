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

import {
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import { AUDIO_SPEECH_MODEL_TOKEN } from "@nestjs-ai/commons";
import { OpenAiAudioSpeechModel } from "../open-ai-audio-speech-model.js";
import { OpenAiAudioSpeechOptions } from "../open-ai-audio-speech-options.js";
import { OpenAiSetup, type OpenAiSetupProps } from "../setup/index.js";
import {
  OPEN_AI_AUDIO_SPEECH_DEFAULT_MODEL,
  type OpenAiAudioSpeechProperties,
} from "./open-ai-audio-speech-properties.js";

export const OPEN_AI_AUDIO_SPEECH_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_AUDIO_SPEECH_PROPERTIES_TOKEN",
);

export interface OpenAiAudioSpeechModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiAudioSpeechProperties> | OpenAiAudioSpeechProperties;
  global?: boolean;
}

@Module({})
export class OpenAiAudioSpeechModelModule {
  static forFeature(
    properties: OpenAiAudioSpeechProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiAudioSpeechModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiAudioSpeechModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiAudioSpeechModelModule,
      imports: [...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_AUDIO_SPEECH_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map(
        (provider) => (provider as FactoryProvider).provide,
      ),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: AUDIO_SPEECH_MODEL_TOKEN,
      useFactory: (properties: OpenAiAudioSpeechProperties) =>
        createOpenAiAudioSpeechModel(properties),
      inject: [OPEN_AI_AUDIO_SPEECH_PROPERTIES_TOKEN],
    },
  ];
}

function createOpenAiAudioSpeechModel(
  properties: OpenAiAudioSpeechProperties,
): OpenAiAudioSpeechModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiAudioSpeechOptions({
    ...connectionProperties,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_AUDIO_SPEECH_DEFAULT_MODEL,
    voice: options?.voice ?? OpenAiAudioSpeechOptions.DEFAULT_VOICE,
    responseFormat:
      options?.responseFormat ??
      OpenAiAudioSpeechOptions.DEFAULT_RESPONSE_FORMAT,
    speed: options?.speed ?? OpenAiAudioSpeechOptions.DEFAULT_SPEED,
    ...options,
  });
  const openAiClient = OpenAiSetup.setupClient(toSetupProps(defaultOptions));

  return new OpenAiAudioSpeechModel({
    openAiClient,
    options: defaultOptions,
  });
}

function toSetupProps(options: OpenAiAudioSpeechOptions): OpenAiSetupProps {
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
