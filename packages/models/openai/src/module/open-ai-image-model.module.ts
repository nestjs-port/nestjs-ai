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
import { IMAGE_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  ImageModelObservationConvention,
  ModelObservationModule,
} from "@nestjs-ai/model";
import type { ObservationRegistry } from "@nestjs-port/core";
import { OBSERVATION_REGISTRY_TOKEN } from "@nestjs-port/core";
import { OpenAiImageModel } from "../open-ai-image-model";
import { OpenAiImageOptions } from "../open-ai-image-options";
import { OpenAiSetup } from "../setup";
import {
  OPEN_AI_IMAGE_DEFAULT_MODEL,
  type OpenAiImageProperties,
} from "./open-ai-image-properties";

export const OPEN_AI_IMAGE_PROPERTIES_TOKEN = Symbol.for(
  "OPEN_AI_IMAGE_PROPERTIES_TOKEN",
);

export interface OpenAiImageModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OpenAiImageProperties> | OpenAiImageProperties;
  global?: boolean;
}

@Module({})
export class OpenAiImageModelModule {
  static forFeature(
    properties: OpenAiImageProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return OpenAiImageModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OpenAiImageModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OpenAiImageModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: OPEN_AI_IMAGE_PROPERTIES_TOKEN,
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
        properties: OpenAiImageProperties,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ImageModelObservationConvention,
      ) =>
        createOpenAiImageModel(
          properties,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        OPEN_AI_IMAGE_PROPERTIES_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ImageModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createOpenAiImageModel(
  properties: OpenAiImageProperties,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ImageModelObservationConvention,
): OpenAiImageModel {
  const { options, ...connectionProperties } = properties;
  const defaultOptions = new OpenAiImageOptions({
    ...connectionProperties,
    ...options,
    model:
      options?.model ??
      connectionProperties.model ??
      OPEN_AI_IMAGE_DEFAULT_MODEL,
  });
  const openAiClient = OpenAiSetup.setupClient(connectionProperties);

  const model = new OpenAiImageModel({
    openAiClient,
    options: defaultOptions,
    observationRegistry,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}
