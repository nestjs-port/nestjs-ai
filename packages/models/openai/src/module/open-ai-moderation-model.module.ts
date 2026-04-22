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
import { AUDIO_MODERATION_MODEL_TOKEN } from "@nestjs-ai/commons";
import { OpenAiModerationModel } from "../open-ai-moderation-model";
import { OpenAiModerationOptions } from "../open-ai-moderation-options";
import { OpenAiSetup, type OpenAiSetupProps } from "../setup";
import {
  OPEN_AI_MODERATION_DEFAULT_MODEL,
  type OpenAiModerationProperties,
} from "./open-ai-moderation-properties";

export const OPEN_AI_MODERATION_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_MODERATION_PROPERTIES_TOKEN",
);

export interface OpenAiModerationModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiModerationProperties> | OpenAiModerationProperties;
  global?: boolean;
}

@Module({})
export class OpenAiModerationModelModule {
  static forFeature(
    properties: OpenAiModerationProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiModerationModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiModerationModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiModerationModelModule,
      imports: [...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_MODERATION_PROPERTIES_TOKEN,
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
      provide: AUDIO_MODERATION_MODEL_TOKEN,
      useFactory: (properties: OpenAiModerationProperties) =>
        createOpenAiModerationModel(properties),
      inject: [OPEN_AI_MODERATION_PROPERTIES_TOKEN],
    },
  ];
}

function createOpenAiModerationModel(
  properties: OpenAiModerationProperties,
): OpenAiModerationModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiModerationOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_MODERATION_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSetup.setupClient(toSetupProps(defaultOptions));

  return new OpenAiModerationModel({
    openAiClient,
    options: defaultOptions,
  });
}

function toSetupProps(options: OpenAiModerationOptions): OpenAiSetupProps {
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
