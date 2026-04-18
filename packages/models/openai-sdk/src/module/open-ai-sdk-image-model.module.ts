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

import type {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  IMAGE_MODEL_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import { ImageModelObservationConvention } from "@nestjs-ai/model";
import { OpenAiSdkImageModel } from "../open-ai-sdk-image-model";
import { OpenAiSdkImageOptions } from "../open-ai-sdk-image-options";
import { OpenAiSdkSetup } from "../setup";
import {
  OPEN_AI_SDK_IMAGE_DEFAULT_MODEL,
  type OpenAiSdkImageProperties,
} from "./open-ai-sdk-image-properties";

export const OPEN_AI_SDK_IMAGE_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_SDK_IMAGE_PROPERTIES_TOKEN",
);

export interface OpenAiSdkImageModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiSdkImageProperties> | OpenAiSdkImageProperties;
  global?: boolean;
}

@Module({})
export class OpenAiSdkImageModelModule {
  static forFeature(
    properties: OpenAiSdkImageProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiSdkImageModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiSdkImageModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiSdkImageModelModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: OPEN_AI_SDK_IMAGE_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as FactoryProvider).provide),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: IMAGE_MODEL_TOKEN,
      useFactory: (
        properties: OpenAiSdkImageProperties,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ImageModelObservationConvention,
      ) =>
        createOpenAiSdkImageModel(
          properties,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        OPEN_AI_SDK_IMAGE_PROPERTIES_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ImageModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createOpenAiSdkImageModel(
  properties: OpenAiSdkImageProperties,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ImageModelObservationConvention,
): OpenAiSdkImageModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiSdkImageOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_SDK_IMAGE_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSdkSetup.setupClient(connectionProperties);

  const model = new OpenAiSdkImageModel({
    openAiClient,
    options: defaultOptions,
    observationRegistry,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
