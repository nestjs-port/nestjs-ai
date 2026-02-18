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
  const defaultOptions = properties.options
    ? new OpenAiChatOptions(properties.options)
    : undefined;

  return new OpenAiChatModel({
    openAiApi,
    defaultOptions,
    observationRegistry,
    observationConvention,
    toolExecutionEligibilityPredicate,
  });
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
