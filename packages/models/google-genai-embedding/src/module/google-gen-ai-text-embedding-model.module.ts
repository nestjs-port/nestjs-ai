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
import {
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  EmbeddingModelObservationConvention,
  ModelObservationModule,
} from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-port/core";

import { GoogleGenAiEmbeddingConnectionDetails } from "../google-gen-ai-embedding-connection-details.js";
import { GoogleGenAiTextEmbeddingModel } from "../text/google-gen-ai-text-embedding-model.js";
import { GoogleGenAiTextEmbeddingOptions } from "../text/google-gen-ai-text-embedding-options.js";
import {
  GOOGLE_GEN_AI_TEXT_EMBEDDING_DEFAULT_MODEL,
  type GoogleGenAiEmbeddingConnectionProperties,
  type GoogleGenAiTextEmbeddingProperties,
} from "./google-gen-ai-embedding-properties.js";

export const GOOGLE_GEN_AI_TEXT_EMBEDDING_PROPERTIES_TOKEN = Symbol.for(
  "GOOGLE_GEN_AI_TEXT_EMBEDDING_PROPERTIES_TOKEN",
);

export interface GoogleGenAiTextEmbeddingModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<GoogleGenAiTextEmbeddingProperties>
    | GoogleGenAiTextEmbeddingProperties;
  global?: boolean;
}

@Module({})
export class GoogleGenAiTextEmbeddingModelModule {
  static forFeature(
    properties: GoogleGenAiTextEmbeddingProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return GoogleGenAiTextEmbeddingModelModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: GoogleGenAiTextEmbeddingModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: GoogleGenAiTextEmbeddingModelModule,
      imports: [ModelObservationModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: GOOGLE_GEN_AI_TEXT_EMBEDDING_PROPERTIES_TOKEN,
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
      provide: GoogleGenAiEmbeddingConnectionDetails,
      useFactory: (properties: GoogleGenAiTextEmbeddingProperties) =>
        createConnectionDetails(properties),
      inject: [GOOGLE_GEN_AI_TEXT_EMBEDDING_PROPERTIES_TOKEN],
    },
    {
      provide: EMBEDDING_MODEL_TOKEN,
      useFactory: (
        properties: GoogleGenAiTextEmbeddingProperties,
        connectionDetails: GoogleGenAiEmbeddingConnectionDetails,
        observationRegistry?: ObservationRegistry,
        observationConvention?: EmbeddingModelObservationConvention,
      ) =>
        createTextEmbeddingModel(
          properties,
          connectionDetails,
          observationRegistry,
          observationConvention,
        ),
      inject: [
        GOOGLE_GEN_AI_TEXT_EMBEDDING_PROPERTIES_TOKEN,
        GoogleGenAiEmbeddingConnectionDetails,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: EmbeddingModelObservationConvention, optional: true },
      ],
    },
  ];
}

function createTextEmbeddingModel(
  properties: GoogleGenAiTextEmbeddingProperties,
  connectionDetails: GoogleGenAiEmbeddingConnectionDetails,
  observationRegistry?: ObservationRegistry,
  observationConvention?: EmbeddingModelObservationConvention,
): GoogleGenAiTextEmbeddingModel {
  const defaultOptions = new GoogleGenAiTextEmbeddingOptions({
    ...properties.options,
    model:
      properties.options?.model ?? GOOGLE_GEN_AI_TEXT_EMBEDDING_DEFAULT_MODEL,
  });

  const model = new GoogleGenAiTextEmbeddingModel({
    connectionDetails,
    defaultOptions,
    observationRegistry:
      observationRegistry ?? NoopObservationRegistry.INSTANCE,
  });

  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}

function createConnectionDetails(
  properties: GoogleGenAiEmbeddingConnectionProperties,
): GoogleGenAiEmbeddingConnectionDetails {
  const builder = GoogleGenAiEmbeddingConnectionDetails.builder();
  const apiKey = normalizedText(properties.apiKey);
  const projectId = normalizedText(properties.projectId);
  const location = normalizedText(properties.location);
  const hasVertexConfig = !!projectId && !!location;

  if (properties.vertexAi) {
    // Vertex AI mode
    assert(
      hasVertexConfig,
      "Google GenAI projectId and location must be set when vertexAi is enabled",
    );
    builder.projectId(projectId ?? null).location(location ?? null);
  } else if (apiKey) {
    // Gemini Developer API mode
    builder.apiKey(apiKey);
  } else if (hasVertexConfig) {
    // Vertex AI mode
    builder.projectId(projectId ?? null).location(location ?? null);
  } else {
    throw new Error(
      "Incomplete Google GenAI configuration: provide apiKey for Gemini API or projectId and location for Vertex AI",
    );
  }

  return builder.build();
}

function normalizedText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
