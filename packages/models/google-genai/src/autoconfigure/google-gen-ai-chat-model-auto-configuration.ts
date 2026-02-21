import assert from "node:assert/strict";
import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";
import {
  CHAT_MODEL_TOKEN,
  type ChatModelConfiguration,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  ChatModelObservationConvention,
  createChatModelObservationHandlerProviders,
  ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { GoogleGenAiCachedContentService } from "../cache";
import { GoogleGenAiChatModel } from "../google-gen-ai-chat-model";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options";
import type {
  GoogleGenAiChatProperties,
  GoogleGenAiConnectionProperties,
} from "./google-gen-ai-properties";

/**
 * Creates a ChatModelConfiguration for Google GenAI that produces a GoogleGenAI client
 * and a GoogleGenAiChatModel.
 */
export function configureGoogleGenAiChatModel(
  properties: GoogleGenAiChatProperties,
): ChatModelConfiguration {
  return {
    providers: [
      ...createChatModelObservationHandlerProviders(),
      ...createGoogleGenAiProviders(properties),
      ...createGoogleGenAiChatModelProviders(properties),
      ...createCachedContentProviders(properties),
    ],
  } as ChatModelConfiguration;
}

function createGoogleGenAiProviders(
  properties: GoogleGenAiChatProperties,
): ChatModelConfiguration["providers"] {
  return [
    {
      token: GoogleGenAI,
      useFactory: () => createGoogleGenAiClient(properties),
      inject: [],
    },
  ];
}

function createGoogleGenAiChatModelProviders(
  properties: GoogleGenAiChatProperties,
): ChatModelConfiguration["providers"] {
  return [
    {
      token: CHAT_MODEL_TOKEN,
      useFactory: (
        genAiClient: GoogleGenAI,
        observationRegistry?: ObservationRegistry,
        observationConvention?: ChatModelObservationConvention,
        toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
      ) =>
        createGoogleGenAiChatModel(
          properties,
          genAiClient,
          observationRegistry,
          observationConvention,
          toolExecutionEligibilityPredicate,
        ),
      inject: [
        GoogleGenAI,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatModelObservationConvention, optional: true },
        { token: ToolExecutionEligibilityPredicate, optional: true },
      ],
    },
  ];
}

function createCachedContentProviders(
  properties: GoogleGenAiChatProperties,
): ChatModelConfiguration["providers"] {
  if (properties.enableCachedContent === false) {
    return [];
  }

  return [
    {
      token: GoogleGenAiCachedContentService,
      useFactory: createGoogleGenAiCachedContentService,
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

function createGoogleGenAiCachedContentService(
  genAiClient: GoogleGenAI,
): GoogleGenAiCachedContentService {
  return new GoogleGenAiCachedContentService(genAiClient);
}

function createGoogleGenAiClient(
  properties: GoogleGenAiConnectionProperties,
): GoogleGenAI {
  const options: GoogleGenAIOptions = {};
  const apiKey = normalizedText(properties.apiKey);
  if (apiKey) {
    // Gemini Developer API mode
    options.apiKey = apiKey;
  } else {
    // Vertex AI mode
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
    // Note: Similar to Spring AI auto-configuration, credentialsUri is kept as
    // connection metadata but is not wired directly into the SDK client here.
  }

  return new GoogleGenAI(options);
}

function normalizedText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
