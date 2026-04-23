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
import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";
import type {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  addToolCallingContentObservationFilter,
  ChatModelObservationConvention,
  ModelObservationModule,
  TOOL_CALLING_MANAGER_TOKEN,
  type ToolCallingManager,
  ToolCallingModule,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import {
  OBSERVATION_REGISTRY_TOKEN,
  ObservationFilters,
  type ObservationRegistry,
} from "@nestjs-port/core";
import { GoogleGenAiCachedContentService } from "../cache/index.js";
import { GoogleGenAiChatModel } from "../google-gen-ai-chat-model.js";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options.js";
import type {
  GoogleGenAiChatProperties,
  GoogleGenAiConnectionProperties,
} from "./google-gen-ai-properties.js";

export const GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN = Symbol.for(
  "GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN",
);

export interface GoogleGenAiChatModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<GoogleGenAiChatProperties> | GoogleGenAiChatProperties;
  global?: boolean;
}

@Module({})
export class GoogleGenAiChatModelModule {
  static forFeature(
    properties: GoogleGenAiChatProperties,
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    const providers = createProviders(properties);

    return {
      module: GoogleGenAiChatModelModule,
      imports: [
        ModelObservationModule,
        ToolCallingModule,
        ...(options?.imports ?? []),
      ],
      providers: [
        {
          provide: GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
          useValue: properties,
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as FactoryProvider).provide),
      global: options?.global ?? false,
    };
  }

  static forFeatureAsync(
    options: GoogleGenAiChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: GoogleGenAiChatModelModule,
      imports: [
        ModelObservationModule,
        ToolCallingModule,
        ...(options.imports ?? []),
      ],
      providers: [
        {
          provide: GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
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

function createProviders(properties?: GoogleGenAiChatProperties): Provider[] {
  return [
    {
      provide: GoogleGenAI,
      useFactory: (props: GoogleGenAiChatProperties) =>
        createGoogleGenAiClient(props),
      inject: [GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN],
    },
    {
      provide: CHAT_MODEL_TOKEN,
      useFactory: (
        props: GoogleGenAiChatProperties,
        genAiClient: GoogleGenAI,
        toolCallingManager: ToolCallingManager,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
        observationFilters?: ObservationFilters,
      ) =>
        createGoogleGenAiChatModel(
          props,
          genAiClient,
          toolCallingManager,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
          observationFilters,
        ),
      inject: [
        GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
        GoogleGenAI,
        TOOL_CALLING_MANAGER_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
        { token: ObservationFilters, optional: true },
      ],
    },
    ...createCachedContentProviders(properties),
  ];
}

function createCachedContentProviders(
  properties?: GoogleGenAiChatProperties,
): Provider[] {
  if (properties?.enableCachedContent === false) {
    return [];
  }

  return [
    {
      provide: GoogleGenAiCachedContentService,
      useFactory: (genAiClient: GoogleGenAI) =>
        new GoogleGenAiCachedContentService(genAiClient),
      inject: [GoogleGenAI],
    },
  ];
}

function createGoogleGenAiChatModel(
  properties: GoogleGenAiChatProperties,
  genAiClient: GoogleGenAI,
  toolCallingManager: ToolCallingManager,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
  observationFilters?: ObservationFilters,
): GoogleGenAiChatModel {
  const defaultOptions = properties.options
    ? new GoogleGenAiChatOptions(properties.options)
    : undefined;

  const model = new GoogleGenAiChatModel({
    genAiClient,
    defaultOptions,
    toolCallingManager,
    observationRegistry,
    observationConvention,
    toolExecutionEligibilityPredicate,
  });

  addToolCallingContentObservationFilter(
    observationFilters,
    properties.toolCalling,
  );

  return model;
}

function createGoogleGenAiClient(
  properties: GoogleGenAiConnectionProperties,
): GoogleGenAI {
  const options: GoogleGenAIOptions = {};
  const apiKey = normalizedText(properties.apiKey);
  const projectId = normalizedText(properties.projectId);
  const location = normalizedText(properties.location);
  const hasVertexConfig = !!projectId && !!location;

  if (properties.vertexAi) {
    assert(
      hasVertexConfig,
      "Google GenAI projectId and location must be set when vertexAi is enabled",
    );
    options.vertexai = true;
    options.project = projectId;
    options.location = location;
  } else if (apiKey) {
    options.apiKey = apiKey;
  } else if (hasVertexConfig) {
    options.vertexai = true;
    options.project = projectId;
    options.location = location;
  } else {
    throw new Error(
      "Incomplete Google GenAI configuration: provide apiKey for Gemini API or projectId and location for Vertex AI",
    );
  }

  return new GoogleGenAI(options);
}

function normalizedText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
