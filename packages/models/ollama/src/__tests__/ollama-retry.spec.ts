/*
 * Copyright 2026-present the original author or authors.
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

import { Prompt, UserMessage } from "@nestjs-ai/model";
import {
  RetryUtils,
  NonTransientAiException,
  TransientAiException,
} from "@nestjs-ai/retry";
import {
  RetryTemplate,
  type RetryListener,
  type RetryPolicy,
  type Retryable,
} from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OllamaApi } from "../api/ollama-api.js";
import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";

const MODEL = OllamaModel.LLAMA3_2.name;

describe("OllamaRetryTests", () => {
  let retryListener: TestRetryListener;
  let retryTemplate: RetryTemplate;
  let ollamaApi: ReturnType<typeof createOllamaApiMock>;
  let chatModel: OllamaChatModel;

  beforeEach(() => {
    ollamaApi = createOllamaApiMock();
    retryTemplate = new RetryTemplate(
      RetryUtils.SHORT_RETRY_TEMPLATE.retryPolicy,
    );
    retryListener = new TestRetryListener();
    retryTemplate.setRetryListener(retryListener);

    chatModel = new OllamaChatModel({
      ollamaApi,
      defaultOptions: OllamaChatOptions.builder()
        .model(MODEL)
        .temperature(0.9)
        .build(),
      retryTemplate,
    });
  });

  it("ollamaChatTransientError", async () => {
    const promptText =
      "What is the capital of Bulgaria and what is the size? What it the national anthem?";
    const expectedChatResponse = createChatResponse("Response");

    ollamaApi.chat
      .mockRejectedValueOnce(new TransientAiException("Transient Error 1"))
      .mockRejectedValueOnce(new TransientAiException("Transient Error 2"))
      .mockResolvedValueOnce(expectedChatResponse);

    const result = await chatModel.call(new Prompt(promptText));

    expect(result).toBeTruthy();
    expect(result.result?.output.text).toBe("Response");
    expect(retryListener.onSuccessRetryCount).toBe(1);
    expect(retryListener.onErrorRetryCount).toBe(2);
  });

  it("ollamaChatSuccessOnFirstAttempt", async () => {
    const promptText = "Simple question";
    const expectedChatResponse = createChatResponse("Quick response");

    ollamaApi.chat.mockResolvedValueOnce(expectedChatResponse);

    const result = await chatModel.call(new Prompt(promptText));

    expect(result).toBeTruthy();
    expect(result.result?.output.text).toBe("Quick response");
    expect(retryListener.onSuccessRetryCount).toBe(0);
    expect(retryListener.onErrorRetryCount).toBe(0);
    expect(ollamaApi.chat).toHaveBeenCalledTimes(1);
  });

  it("ollamaChatNonTransientErrorShouldNotRetry", async () => {
    const promptText = "Invalid request";

    ollamaApi.chat.mockRejectedValueOnce(
      new NonTransientAiException("Model not found"),
    );

    await expect(chatModel.call(new Prompt(promptText))).rejects.toThrow(
      "Model not found",
    );

    expect(retryListener.onSuccessRetryCount).toBe(0);
    expect(retryListener.onErrorRetryCount).toBe(0);
    expect(ollamaApi.chat).toHaveBeenCalledTimes(1);
  });

  it("ollamaChatWithMultipleMessages", async () => {
    const messages = [
      UserMessage.of("What is AI?"),
      UserMessage.of("Explain machine learning"),
    ];
    const prompt = new Prompt(messages);
    const expectedChatResponse = createChatResponse(
      "AI is artificial intelligence...",
    );

    ollamaApi.chat
      .mockRejectedValueOnce(new TransientAiException("Temporary overload"))
      .mockResolvedValueOnce(expectedChatResponse);

    const result = await chatModel.call(prompt);

    expect(result).toBeTruthy();
    expect(result.result?.output.text).toBe("AI is artificial intelligence...");
    expect(retryListener.onSuccessRetryCount).toBe(1);
    expect(retryListener.onErrorRetryCount).toBe(1);
  });

  it("ollamaChatWithCustomOptions", async () => {
    const promptText = "Custom temperature request";
    const customOptions = OllamaChatOptions.builder()
      .model(MODEL)
      .temperature(0.1)
      .topP(0.9)
      .build();
    const expectedChatResponse = createChatResponse("Deterministic response");

    ollamaApi.chat
      .mockRejectedValueOnce(new TransientAiException("Connection timeout"))
      .mockResolvedValueOnce(expectedChatResponse);

    const result = await chatModel.call(new Prompt(promptText, customOptions));

    expect(result).toBeTruthy();
    expect(result.result?.output.text).toBe("Deterministic response");
    expect(retryListener.onSuccessRetryCount).toBe(1);
  });

  it("ollamaChatWithEmptyResponse", async () => {
    const promptText = "Edge case request";
    const expectedChatResponse = createChatResponse("");

    ollamaApi.chat
      .mockRejectedValueOnce(new TransientAiException("Rate limit exceeded"))
      .mockResolvedValueOnce(expectedChatResponse);

    const result = await chatModel.call(new Prompt(promptText));

    expect(result).toBeTruthy();
    expect(result.result?.output.text).toBe("");
    expect(retryListener.onSuccessRetryCount).toBe(1);
  });
});

class TestRetryListener implements RetryListener {
  onErrorRetryCount = 0;

  onSuccessRetryCount = 0;

  beforeRetry(
    _retryPolicy: RetryPolicy,
    _retryable: Retryable,
    _retryableName: string,
  ): void {
    // Count each retry attempt
    this.onErrorRetryCount++;
  }

  onRetrySuccess(
    _retryPolicy: RetryPolicy,
    _retryable: Retryable,
    _retryableName: string,
    _result: unknown,
  ): void {
    // Count successful retries - we increment when we succeed after a failure
    this.onSuccessRetryCount++;
  }
}

function createOllamaApiMock() {
  return {
    chat: vi.fn(),
  } as unknown as OllamaApi & {
    chat: ReturnType<typeof vi.fn<OllamaApi["chat"]>>;
  };
}

function createChatResponse(content: string): OllamaApi.ChatResponse {
  return {
    model: MODEL,
    created_at: "2026-01-01T00:00:00Z",
    message: {
      role: OllamaApi.Message.Role.ASSISTANT,
      content,
    },
    done: true,
    done_reason: "stop",
  };
}
