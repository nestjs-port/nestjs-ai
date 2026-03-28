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
  CHAT_MODEL_TOKEN,
  type ChatModelConfiguration,
  HTTP_CLIENT_TOKEN,
  type HttpClient,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  ChatModelObservationConvention,
  createModelObservationHandlerProviders,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { OpenAiApi } from "../api";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";
import type { OpenAiChatProperties } from "./open-ai-properties";

/**
 * Creates a ChatModelConfiguration for OpenAI that produces an OpenAiApi and OpenAiChatModel.
 */
export function configureOpenAiChatModel(
  properties: OpenAiChatProperties,
): ChatModelConfiguration {
  return {
    providers: [
      ...createModelObservationHandlerProviders(),
      ...createOpenAiApiProviders(properties),
      ...createOpenAiChatModelProviders(properties),
    ],
  } as ChatModelConfiguration;
}

function createOpenAiApiProviders(
  properties: OpenAiChatProperties,
): ChatModelConfiguration["providers"] {
  return [
    {
      token: OpenAiApi,
      useFactory: (httpClient: HttpClient) =>
        createOpenAiApi(properties, httpClient),
      inject: [HTTP_CLIENT_TOKEN],
    },
  ];
}

function createOpenAiChatModelProviders(
  properties: OpenAiChatProperties,
): ChatModelConfiguration["providers"] {
  return [
    {
      token: CHAT_MODEL_TOKEN,
      useFactory: (
        openAiApi: OpenAiApi,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createOpenAiChatModel(
          properties,
          openAiApi,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        OpenAiApi,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
      ],
    },
  ];
}

function createOpenAiChatModel(
  properties: OpenAiChatProperties,
  openAiApi: OpenAiApi,
  observationRegistry?: ObservationRegistry,
  observationConvention?: ChatModelObservationConvention,
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
): OpenAiChatModel {
  const builder = OpenAiChatModel.builder().openAiApi(openAiApi);

  if (properties.options) {
    builder.defaultOptions(new OpenAiChatOptions(properties.options));
  }
  if (observationRegistry) {
    builder.observationRegistry(observationRegistry);
  }
  if (toolExecutionEligibilityPredicate) {
    builder.toolExecutionEligibilityPredicate(
      toolExecutionEligibilityPredicate,
    );
  }

  const model = builder.build();
  if (observationConvention) {
    model.setObservationConvention(observationConvention);
  }

  return model;
}

function createOpenAiApi(
  properties: OpenAiChatProperties,
  httpClient: HttpClient,
): OpenAiApi {
  const headers = new Headers();
  if (properties.projectId) {
    headers.set("OpenAI-Project", properties.projectId);
  }
  if (properties.organizationId) {
    headers.set("OpenAI-Organization", properties.organizationId);
  }

  const builder = OpenAiApi.builder();

  if (properties.apiKey) {
    builder.apiKey(properties.apiKey);
  }
  if (properties.baseUrl) {
    builder.baseUrl(properties.baseUrl);
  }
  if (properties.completionsPath) {
    builder.completionsPath(properties.completionsPath);
  }

  builder.headers(headers);
  builder.httpClient(httpClient);

  return builder.build();
}
