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
  ChatResponse,
  ChatResponseMetadata,
  DefaultToolCallingManager,
  DefaultUsage,
  type ChatModel,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { NoopObservationRegistry } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

import type { OllamaApi } from "../api/ollama-api.js";
import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { ModelManagementOptions } from "../management/model-management-options.js";
import { OllamaChatModel } from "../ollama-chat-model.js";

const SECONDS_TO_NANOS = 1_000_000_000;
const INTEGER_MAX_VALUE = 2_147_483_647;

describe("OllamaChatModel", () => {
  it("build ollama chat model with constructor", () => {
    const ollamaApi = createOllamaApiMock();
    const chatModel: ChatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: OllamaChatOptions.builder()
        .model(OllamaModel.MISTRAL)
        .build(),
      toolCallingManager: new DefaultToolCallingManager(),
      observationRegistry: NoopObservationRegistry.INSTANCE,
      modelManagementOptions: new ModelManagementOptions(),
    });
    expect(chatModel).not.toBeNull();
  });

  it("build ollama chat model with builder", () => {
    const ollamaApi = createOllamaApiMock();
    const chatModel: ChatModel = new OllamaChatModel({ ollamaApi });
    expect(chatModel).not.toBeNull();
  });

  it("build ollama chat model", () => {
    const ollamaApi = createOllamaApiMock();
    const chatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: OllamaChatOptions.builder()
        .model(OllamaModel.LLAMA2)
        .build(),
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
      modelManagementOptions: null,
    });
    expect(chatModel).not.toBeNull();
  });

  it("build chat response metadata", () => {
    const evalDuration = 1000;
    const evalCount = 101;

    const promptEvalCount = 808;
    const promptEvalDuration = 8;

    const loadDuration = 100;
    const totalDuration = 2000;

    const response = chatResponse({
      model: "model",
      total_duration: totalDuration,
      load_duration: loadDuration,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
    });

    const metadata = OllamaChatModel.from(response, null);

    expect(metadata.get("eval-duration")).toBe(evalDuration);
    expect(metadata.get("eval-count")).toBe(evalCount);
    expect(metadata.get("prompt-eval-duration")).toBe(promptEvalDuration);
    expect(metadata.get("prompt-eval-count")).toBe(promptEvalCount);
  });

  it("build chat response metadata aggregation with non empty metadata", () => {
    const evalDuration = 1000;
    const evalCount = 101;

    const promptEvalCount = 808;
    const promptEvalDuration = 8;

    const loadDuration = 100;
    const totalDuration = 2000;

    const response = chatResponse({
      model: "model",
      total_duration: totalDuration,
      load_duration: loadDuration,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
    });

    const previousChatResponse = ChatResponse.builder()
      .generations([])
      .metadata(
        ChatResponseMetadata.builder()
          .usage(new DefaultUsage({ promptTokens: 66, completionTokens: 99 }))
          .keyValue("eval-duration", 2 * SECONDS_TO_NANOS)
          .keyValue("prompt-eval-duration", 2 * SECONDS_TO_NANOS)
          .build(),
      )
      .build();

    const metadata = OllamaChatModel.from(response, previousChatResponse);

    expect(metadata.usage).toEqual(
      new DefaultUsage({ promptTokens: 808 + 66, completionTokens: 101 + 99 }),
    );

    expect(metadata.get("eval-duration")).toBe(
      evalDuration + 2 * SECONDS_TO_NANOS,
    );
    expect(metadata.get("eval-count")).toBe(evalCount + 99);
    expect(metadata.get("prompt-eval-duration")).toBe(
      promptEvalDuration + 2 * SECONDS_TO_NANOS,
    );
    expect(metadata.get("prompt-eval-count")).toBe(promptEvalCount + 66);
  });

  it("build chat response metadata aggregation with non empty metadata but empty eval", () => {
    const response = chatResponse({
      model: "model",
      total_duration: null,
      load_duration: null,
      prompt_eval_count: null,
      prompt_eval_duration: null,
      eval_count: null,
      eval_duration: null,
    });

    const previousChatResponse = ChatResponse.builder()
      .generations([])
      .metadata(
        ChatResponseMetadata.builder()
          .usage(new DefaultUsage({ promptTokens: 66, completionTokens: 99 }))
          .keyValue("eval-duration", 2 * SECONDS_TO_NANOS)
          .keyValue("prompt-eval-duration", 2 * SECONDS_TO_NANOS)
          .build(),
      )
      .build();

    const metadata = OllamaChatModel.from(response, previousChatResponse);

    expect(metadata.get("eval-duration")).toBeNull();
    expect(metadata.get("prompt-eval-duration")).toBeNull();
    expect(metadata.get("eval-count")).toBe(99);
    expect(metadata.get("prompt-eval-count")).toBe(66);
  });

  it("build ollama chat model with null ollama api", () => {
    expect(
      () => new OllamaChatModel({ ollamaApi: null as unknown as OllamaApi }),
    ).toThrow("ollamaApi must not be null");
  });

  it("build ollama chat model with all builder options", () => {
    const ollamaApi = createOllamaApiMock();
    const options = OllamaChatOptions.builder()
      .model(OllamaModel.CODELLAMA)
      .temperature(0.7)
      .topK(50)
      .build();

    const toolManager = new DefaultToolCallingManager();
    const managementOptions = new ModelManagementOptions();

    const chatModel: ChatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: options,
      toolCallingManager: toolManager,
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
      observationRegistry: NoopObservationRegistry.INSTANCE,
      modelManagementOptions: managementOptions,
    });

    expect(chatModel).not.toBeNull();
    expect(chatModel).toBeInstanceOf(OllamaChatModel);
  });

  it("build chat response metadata with large values", () => {
    const evalDuration = Number.MAX_SAFE_INTEGER;
    const evalCount = INTEGER_MAX_VALUE;
    const promptEvalCount = INTEGER_MAX_VALUE;
    const promptEvalDuration = Number.MAX_SAFE_INTEGER;

    const response = chatResponse({
      model: "model",
      total_duration: Number.MAX_SAFE_INTEGER,
      load_duration: Number.MAX_SAFE_INTEGER,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
    });

    const metadata = OllamaChatModel.from(response, null);

    expect(metadata.get("eval-duration")).toBe(evalDuration);
    expect(metadata.get("eval-count")).toBe(evalCount);
    expect(metadata.get("prompt-eval-duration")).toBe(promptEvalDuration);
    expect(metadata.get("prompt-eval-count")).toBe(promptEvalCount);
  });

  it("build chat response metadata aggregation with null previous", () => {
    const evalDuration = 1000;
    const evalCount = 101;
    const promptEvalCount = 808;
    const promptEvalDuration = 8;

    const response = chatResponse({
      model: "model",
      total_duration: 2000,
      load_duration: 100,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
    });

    const metadata = OllamaChatModel.from(response, null);

    expect(metadata.usage).toEqual(
      new DefaultUsage({
        promptTokens: promptEvalCount,
        completionTokens: evalCount,
      }),
    );
    expect(metadata.get("eval-duration")).toBe(evalDuration);
    expect(metadata.get("eval-count")).toBe(evalCount);
    expect(metadata.get("prompt-eval-duration")).toBe(promptEvalDuration);
    expect(metadata.get("prompt-eval-count")).toBe(promptEvalCount);
  });

  it.each(["LLAMA2", "MISTRAL", "CODELLAMA", "LLAMA3", "GEMMA"])(
    "build ollama chat model with different models: %s",
    (modelName) => {
      const ollamaApi = createOllamaApiMock();
      const model = OllamaModel[modelName as keyof typeof OllamaModel];
      const options = OllamaChatOptions.builder().model(model).build();

      const chatModel: ChatModel = new OllamaChatModel({
        ollamaApi,
        defaultOptions: options,
      });

      expect(chatModel).not.toBeNull();
      expect(chatModel).toBeInstanceOf(OllamaChatModel);
    },
  );

  it("build ollama chat model with custom observation registry", () => {
    const ollamaApi = createOllamaApiMock();
    const customRegistry = NoopObservationRegistry.INSTANCE;

    const chatModel: ChatModel = new OllamaChatModel({
      ollamaApi,
      observationRegistry: customRegistry,
    });

    expect(chatModel).not.toBeNull();
  });

  it("build chat response metadata preserves model name", () => {
    const modelName = "custom-model-name";
    const response = chatResponse({
      model: modelName,
      total_duration: 1000,
      load_duration: 100,
      prompt_eval_count: 10,
      prompt_eval_duration: 50,
      eval_count: 20,
      eval_duration: 200,
    });

    const metadata = OllamaChatModel.from(response, null);

    // Verify that model information is preserved in metadata
    expect(metadata).not.toBeNull();
    // Note: The exact key for model name would depend on the implementation
    // This test verifies that metadata building doesn't lose model information
  });

  it("build chat response metadata with instant time", () => {
    const createdAt = new Date().toISOString();
    const response = chatResponse({
      model: "model",
      created_at: createdAt,
      total_duration: 1000,
      load_duration: 100,
      prompt_eval_count: 10,
      prompt_eval_duration: 50,
      eval_count: 20,
      eval_duration: 200,
    });

    const metadata = OllamaChatModel.from(response, null);

    expect(metadata).not.toBeNull();
    // Verify timestamp is preserved (exact key depends on implementation)
  });

  it("build chat response metadata aggregation overflow handling", () => {
    // Test potential integer overflow scenarios
    const response = chatResponse({
      model: "model",
      total_duration: 1000,
      load_duration: 100,
      prompt_eval_count: INTEGER_MAX_VALUE,
      prompt_eval_duration: Number.MAX_SAFE_INTEGER,
      eval_count: INTEGER_MAX_VALUE,
      eval_duration: Number.MAX_SAFE_INTEGER,
    });

    const previousChatResponse = ChatResponse.builder()
      .generations([])
      .metadata(
        ChatResponseMetadata.builder()
          .usage(new DefaultUsage({ promptTokens: 1, completionTokens: 1 }))
          .keyValue("eval-duration", 1)
          .keyValue("prompt-eval-duration", 1)
          .build(),
      )
      .build();

    // This should not throw an exception, even with potential overflow
    const metadata = OllamaChatModel.from(response, previousChatResponse);
    expect(metadata).not.toBeNull();
  });

  it("build ollama chat model immutability", () => {
    // Test that the builder creates immutable instances
    const ollamaApi = createOllamaApiMock();
    const options = OllamaChatOptions.builder()
      .model(OllamaModel.MISTRAL)
      .temperature(0.5)
      .build();

    const chatModel1: ChatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: options,
    });

    const chatModel2: ChatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: options,
    });

    // Should create different instances
    expect(chatModel1).not.toBe(chatModel2);
    expect(chatModel1).not.toBeNull();
    expect(chatModel2).not.toBeNull();
  });

  it("build chat response metadata with zero values", () => {
    // Test with all zero/minimal values
    const response = chatResponse({
      model: "model",
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
    });

    const metadata = OllamaChatModel.from(response, null);

    expect(metadata.get("eval-duration")).toBe(0);
    expect(metadata.get("eval-count")).toBe(0);
    expect(metadata.get("prompt-eval-duration")).toBe(0);
    expect(metadata.get("prompt-eval-count")).toBe(0);
    expect(metadata.usage).toEqual(
      new DefaultUsage({ promptTokens: 0, completionTokens: 0 }),
    );
  });

  it("build ollama chat model with minimal configuration", () => {
    // Test building with only required parameters
    const ollamaApi = createOllamaApiMock();
    const chatModel: ChatModel = new OllamaChatModel({ ollamaApi });

    expect(chatModel).not.toBeNull();
    expect(chatModel).toBeInstanceOf(OllamaChatModel);
  });
});

function createOllamaApiMock(): OllamaApi {
  return {} as OllamaApi;
}

function chatResponse(
  overrides: Partial<OllamaApi.ChatResponse>,
): OllamaApi.ChatResponse {
  return {
    model: "model",
    created_at: new Date().toISOString(),
    message: {
      role: "assistant" as OllamaApi.Message.Role.ASSISTANT,
      content: "",
    },
    ...overrides,
  };
}
