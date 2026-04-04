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
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  CHAT_MODEL_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  ChatModelObservationConvention,
  createModelObservationHandlerProviders,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { GoogleGenAiCachedContentService } from "../cache";
import { GoogleGenAiChatModel } from "../google-gen-ai-chat-model";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options";
import type {
  GoogleGenAiChatProperties,
  GoogleGenAiConnectionProperties,
} from "./google-gen-ai-properties";

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
      imports: options?.imports ?? [],
      providers: [
        {
          provide: GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
          useValue: properties,
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as { provide: InjectionToken }).provide),
      global: options?.global ?? false,
    };
  }

  static forFeatureAsync(
    options: GoogleGenAiChatModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: GoogleGenAiChatModelModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as { provide: InjectionToken }).provide),
      global: options.global ?? false,
    };
  }
}

function createProviders(properties?: GoogleGenAiChatProperties): Provider[] {
  return [
    ...createModelObservationHandlerProviders(),
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
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createGoogleGenAiChatModel(
          props,
          genAiClient,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        GOOGLE_GEN_AI_CHAT_PROPERTIES_TOKEN,
        GoogleGenAI,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
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
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): GoogleGenAiChatModel {
  const defaultOptions = properties.options
    ? new GoogleGenAiChatOptions(properties.options)
    : undefined;

  return new GoogleGenAiChatModel({
    genAiClient,
    defaultOptions,
    observationRegistry,
    observationConvention,
    toolExecutionEligibilityPredicate,
  });
}

function createGoogleGenAiClient(
  properties: GoogleGenAiConnectionProperties,
): GoogleGenAI {
  const options: GoogleGenAIOptions = {};
  const apiKey = normalizedText(properties.apiKey);
  if (apiKey) {
    options.apiKey = apiKey;
  } else {
    const projectId = normalizedText(properties.projectId);
    const location = normalizedText(properties.location);
    assert(
      projectId,
      "Google GenAI projectId must be set when apiKey is not provided",
    );
    assert(
      location,
      "Google GenAI location must be set when apiKey is not provided",
    );
    options.vertexai = true;
    options.project = projectId;
    options.location = location;
  }

  return new GoogleGenAI(options);
}

function normalizedText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
