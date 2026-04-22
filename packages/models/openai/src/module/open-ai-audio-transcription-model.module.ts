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
import { AUDIO_TRANSCRIPTION_MODEL_TOKEN } from "@nestjs-ai/commons";
import { OpenAiAudioTranscriptionModel } from "../open-ai-audio-transcription-model";
import { OpenAiAudioTranscriptionOptions } from "../open-ai-audio-transcription-options";
import { OpenAiSetup, type OpenAiSetupProps } from "../setup";
import {
  OPEN_AI_AUDIO_TRANSCRIPTION_DEFAULT_MODEL,
  type OpenAiAudioTranscriptionProperties,
} from "./open-ai-audio-transcription-properties";

export const OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN",
);

export interface OpenAiAudioTranscriptionModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<OpenAiAudioTranscriptionProperties>
    | OpenAiAudioTranscriptionProperties;
  global?: boolean;
}

@Module({})
export class OpenAiAudioTranscriptionModelModule {
  static forFeature(
    properties: OpenAiAudioTranscriptionProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiAudioTranscriptionModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiAudioTranscriptionModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiAudioTranscriptionModelModule,
      imports: [...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN,
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
      provide: AUDIO_TRANSCRIPTION_MODEL_TOKEN,
      useFactory: (properties: OpenAiAudioTranscriptionProperties) =>
        createOpenAiAudioTranscriptionModel(properties),
      inject: [OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN],
    },
  ];
}

function createOpenAiAudioTranscriptionModel(
  properties: OpenAiAudioTranscriptionProperties,
): OpenAiAudioTranscriptionModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiAudioTranscriptionOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_AUDIO_TRANSCRIPTION_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSetup.setupClient(toSetupProps(defaultOptions));

  return new OpenAiAudioTranscriptionModel({
    openAiClient,
    options: defaultOptions,
  });
}

function toSetupProps(
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
