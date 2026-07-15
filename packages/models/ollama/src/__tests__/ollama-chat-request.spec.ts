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
  AssistantMessage,
  Prompt,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { describe, expect, it } from "vitest";

import { OllamaApi } from "../api/ollama-api.js";
import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";

describe("OllamaChatRequest", () => {
  const chatModel = new OllamaChatModel({
    ollamaApi: new OllamaApi({}),
    defaultOptions: OllamaChatOptions.builder()
      .model("MODEL_NAME")
      .topK(99)
      .temperature(66.6)
      .numGPU(1)
      .build(),
    retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
  });

  it("create request with default options", () => {
    const prompt = chatModel.buildRequestPrompt(
      new Prompt("Test message content"),
    );

    const request = chatModel.ollamaChatRequest(prompt, false);

    expect(request.messages).toHaveLength(1);
    expect(request.stream).toBe(false);

    expect(request.model).toBe("MODEL_NAME");
    expect(request.options.temperature).toBe(66.6);
    expect(request.options.top_k).toBe(99);
    expect(request.options.num_gpu).toBe(1);
    expect(request.options.top_p).toBeUndefined();
  });

  it("create request with prompt ollama options", () => {
    const promptOptions = OllamaChatOptions.builder()
      .model(OllamaModel.QWEN_2_5_3B)
      .temperature(0.8)
      .topP(0.5)
      .numGPU(2)
      .build();

    const prompt = chatModel.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );

    const request = chatModel.ollamaChatRequest(prompt, true);

    expect(request.messages).toHaveLength(1);
    expect(request.stream).toBe(true);

    expect(request.model).toBe(OllamaModel.QWEN_2_5_3B.id());
    expect(request.options.temperature).toBe(0.8);
    expect(request.options.top_k).toBe(99);
    expect(request.options.num_gpu).toBe(2);
    expect(request.options.top_p).toBe(0.5);
  });

  it("create request with prompt options model override", () => {
    const promptOptions = OllamaChatOptions.builder()
      .model("PROMPT_MODEL")
      .build();
    const prompt = chatModel.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );

    const request = chatModel.ollamaChatRequest(prompt, true);

    expect(request.model).toBe("PROMPT_MODEL");
  });

  it("create request with default options model override", () => {
    const modelWithDefaultOverride = new OllamaChatModel({
      ollamaApi: new OllamaApi({}),
      defaultOptions: OllamaChatOptions.builder()
        .model("DEFAULT_OPTIONS_MODEL")
        .build(),
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
    });

    const prompt1 = modelWithDefaultOverride.buildRequestPrompt(
      new Prompt("Test message content"),
    );

    let request = modelWithDefaultOverride.ollamaChatRequest(prompt1, true);
    expect(request.model).toBe("DEFAULT_OPTIONS_MODEL");

    const promptOptions = OllamaChatOptions.builder()
      .model("PROMPT_MODEL")
      .build();
    const prompt2 = modelWithDefaultOverride.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );

    request = modelWithDefaultOverride.ollamaChatRequest(prompt2, true);
    expect(request.model).toBe("PROMPT_MODEL");
  });

  it("create request with default options model chat options override", () => {
    const modelWithDefaultOverride = new OllamaChatModel({
      ollamaApi: new OllamaApi({}),
      defaultOptions: OllamaChatOptions.builder()
        .model("DEFAULT_OPTIONS_MODEL")
        .build(),
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
    });

    const prompt1 = modelWithDefaultOverride.buildRequestPrompt(
      new Prompt("Test message content"),
    );

    let request = modelWithDefaultOverride.ollamaChatRequest(prompt1, true);
    expect(request.model).toBe("DEFAULT_OPTIONS_MODEL");

    const promptOptions = OllamaChatOptions.builder()
      .model("PROMPT_MODEL")
      .build();
    const prompt2 = modelWithDefaultOverride.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );

    request = modelWithDefaultOverride.ollamaChatRequest(prompt2, true);
    expect(request.model).toBe("PROMPT_MODEL");
  });

  it("create request with all message types", () => {
    const prompt = chatModel.buildRequestPrompt(
      new Prompt(createMessagesWithAllMessageTypes()),
    );

    const request = chatModel.ollamaChatRequest(prompt, false);

    expect(request.messages).toHaveLength(6);

    const ollamaSystemMessage = request.messages[0];
    expect(ollamaSystemMessage.role).toBe(OllamaApi.Message.Role.SYSTEM);
    expect(ollamaSystemMessage.content).toBe("Test system message");

    const ollamaUserMessage = request.messages[1];
    expect(ollamaUserMessage.role).toBe(OllamaApi.Message.Role.USER);
    expect(ollamaUserMessage.content).toBe("Test user message");

    const ollamaToolResponse1 = request.messages[2];
    expect(ollamaToolResponse1.role).toBe(OllamaApi.Message.Role.TOOL);
    expect(ollamaToolResponse1.content).toBe("Test tool response 1");

    const ollamaToolResponse2 = request.messages[3];
    expect(ollamaToolResponse2.role).toBe(OllamaApi.Message.Role.TOOL);
    expect(ollamaToolResponse2.content).toBe("Test tool response 2");

    const ollamaToolResponse3 = request.messages[4];
    expect(ollamaToolResponse3.role).toBe(OllamaApi.Message.Role.TOOL);
    expect(ollamaToolResponse3.content).toBe("Test tool response 3");

    const ollamaAssistantMessage = request.messages[5];
    expect(ollamaAssistantMessage.role).toBe(OllamaApi.Message.Role.ASSISTANT);
    expect(ollamaAssistantMessage.content).toBe("Test assistant message");
  });
});

function createMessagesWithAllMessageTypes() {
  const systemMessage = new SystemMessage({ content: "Test system message" });
  const userMessage = new UserMessage({ content: "Test user message" });
  const toolResponseMessage = new ToolResponseMessage({
    responses: [
      { id: "tool1", name: "Tool 1", responseData: "Test tool response 1" },
      { id: "tool2", name: "Tool 2", responseData: "Test tool response 2" },
      { id: "tool3", name: "Tool 3", responseData: "Test tool response 3" },
    ],
  });
  const assistantMessage = new AssistantMessage({
    content: "Test assistant message",
  });

  return [systemMessage, userMessage, toolResponseMessage, assistantMessage];
}
