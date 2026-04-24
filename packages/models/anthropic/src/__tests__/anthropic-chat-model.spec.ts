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

import type { Anthropic } from "@anthropic-ai/sdk";
import type {
  Message as AnthropicMessage,
  MessageCreateParams,
  OutputConfig,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import {
  AssistantMessage,
  Prompt,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AnthropicCacheOptions,
  AnthropicCacheStrategy,
  AnthropicChatModel,
  type AnthropicChatModelProps,
  AnthropicChatOptions,
  AnthropicSkill,
} from "../index.js";

describe("AnthropicChatModel", () => {
  let anthropicClient: Anthropic;
  let create: ReturnType<typeof vi.fn>;
  let chatModel: AnthropicChatModel;

  beforeEach(() => {
    create = vi.fn();
    anthropicClient = {
      messages: {
        create,
      },
    } as unknown as Anthropic;

    chatModel = new AnthropicChatModel({
      anthropicClient,
      defaultOptions: AnthropicChatOptions.builder()
        .model("claude-sonnet-4-20250514")
        .maxTokens(1024)
        .temperature(0.7)
        .build(),
    } satisfies AnthropicChatModelProps);
  });

  it("call with simple user message", async () => {
    const mockResponse = createMockMessage(
      "Hello! How can I help you today?",
      "end_turn",
    );
    create.mockResolvedValue(mockResponse);

    const response = await chatModel.call(new Prompt("Hello"));

    assert.exists(response);
    assert.exists(response.result);
    expect(response.result?.output.text).toBe(
      "Hello! How can I help you today?",
    );

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    expect(request.model).toBe("claude-sonnet-4-20250514");
    expect(request.max_tokens).toBe(1024);
  });

  it("call with system and user messages", async () => {
    const mockResponse = createMockMessage(
      "I am a helpful assistant.",
      "end_turn",
    );
    create.mockResolvedValue(mockResponse);

    const systemMessage = SystemMessage.of("You are a helpful assistant.");
    const userMessage = UserMessage.of("Who are you?");

    const response = await chatModel.call(
      new Prompt([systemMessage, userMessage]),
    );

    expect(response.result?.output.text).toBe("I am a helpful assistant.");

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    assert.exists(request.system);
  });

  it("call with runtime options override", async () => {
    const mockResponse = createMockMessage(
      "Response with override",
      "end_turn",
    );
    create.mockResolvedValue(mockResponse);

    const runtimeOptions = AnthropicChatOptions.builder()
      .model("claude-3-opus-20240229")
      .maxTokens(2048)
      .temperature(0.3)
      .build();

    const response = await chatModel.call(new Prompt("Test", runtimeOptions));

    assert.exists(response);

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    expect(request.model).toBe("claude-3-opus-20240229");
    expect(request.max_tokens).toBe(2048);
  });

  it("response contains usage metadata", async () => {
    const mockResponse = createMockMessage("Test response", "end_turn");
    create.mockResolvedValue(mockResponse);

    const response = await chatModel.call(new Prompt("Test"));

    assert.exists(response.metadata);
    assert.exists(response.metadata.usage);
    expect(response.metadata.usage.promptTokens).toBe(10);
    expect(response.metadata.usage.completionTokens).toBe(20);
    expect(response.metadata.usage.totalTokens).toBe(30);
  });

  it("response contains finish reason", async () => {
    const mockResponse = createMockMessage(
      "Stopped at max tokens",
      "max_tokens",
    );
    create.mockResolvedValue(mockResponse);

    const response = await chatModel.call(new Prompt("Test"));

    expect(response.result?.metadata.finishReason).toBe("max_tokens");
  });

  it("response with tool use block", async () => {
    const mockResponse = createMockMessageWithToolUse(
      "toolu_123",
      "getCurrentWeather",
      { location: "San Francisco" },
      "tool_use",
    );
    create.mockResolvedValue(mockResponse);

    // Disable internal tool execution to verify tool call parsing only
    const options = AnthropicChatOptions.builder()
      .internalToolExecutionEnabled(false)
      .build();

    const response = await chatModel.call(
      new Prompt("What's the weather?", options),
    );

    assert.exists(response.result);
    const output = response.result?.output as AssistantMessage;
    expect(output.toolCalls).not.toHaveLength(0);
    expect(output.toolCalls).toHaveLength(1);

    const toolCall = output.toolCalls[0];
    expect(toolCall?.id).toBe("toolu_123");
    expect(toolCall?.name).toBe("getCurrentWeather");
    expect(toolCall?.arguments).toContain("San Francisco");
  });

  it("get default options returns copy", () => {
    const defaultOptions1 = chatModel.defaultOptions as AnthropicChatOptions;
    const defaultOptions2 = chatModel.defaultOptions as AnthropicChatOptions;

    expect(defaultOptions1).not.toBe(defaultOptions2);
    expect(defaultOptions1.model).toBe(defaultOptions2.model);
  });

  it("cache options is merged from runtime prompt", () => {
    const model = new AnthropicChatModel({
      anthropicClient,
      defaultOptions: AnthropicChatOptions.builder()
        .model("default-model")
        .maxTokens(1000)
        .build(),
    } satisfies AnthropicChatModelProps);

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
    });

    const runtimeOptions = AnthropicChatOptions.builder()
      .cacheOptions(cacheOptions)
      .build();

    const originalPrompt = new Prompt("Test", runtimeOptions);
    const requestPrompt = model.buildRequestPrompt(originalPrompt);

    expect(requestPrompt.options).toBe(runtimeOptions);
    const mergedOptions = requestPrompt.options as AnthropicChatOptions;
    assert.exists(mergedOptions.cacheOptions);
    expect(mergedOptions.cacheOptions.strategy).toBe(
      AnthropicCacheStrategy.SYSTEM_ONLY,
    );
  });

  it("multi turn conversation", async () => {
    const mockResponse = createMockMessage(
      "Paris is the capital of France.",
      "end_turn",
    );
    create.mockResolvedValue(mockResponse);

    const user1 = UserMessage.of("What is the capital of France?");
    const assistant1 = AssistantMessage.of("The capital of France is Paris.");
    const user2 = UserMessage.of("What is its population?");

    const response = await chatModel.call(
      new Prompt([user1, assistant1, user2]),
    );

    expect(response.result?.output.text).toBe(
      "Paris is the capital of France.",
    );

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    expect(request.messages).toHaveLength(3);
  });

  it("call with output config", async () => {
    const mockResponse = createMockMessage('{ "name": "test" }', "end_turn");
    create.mockResolvedValue(mockResponse);

    const outputConfig: OutputConfig = { effort: "high" };
    const options = AnthropicChatOptions.builder()
      .outputConfig(outputConfig)
      .build();

    const response = await chatModel.call(new Prompt("Generate JSON", options));

    assert.exists(response);

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    assert.exists(request.output_config);
    expect(request.output_config.effort).toBe("high");
  });

  it("call with output schema", async () => {
    const mockResponse = createMockMessage('{ "name": "France" }', "end_turn");
    create.mockResolvedValue(mockResponse);

    const options = AnthropicChatOptions.builder()
      .outputSchema('{"type":"object","properties":{"name":{"type":"string"}}}')
      .build();

    const response = await chatModel.call(new Prompt("Generate JSON", options));

    assert.exists(response);

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    assert.exists(request.output_config);
    assert.exists(request.output_config.format);
  });

  it("call with http headers", async () => {
    const mockResponse = createMockMessage("Hello", "end_turn");
    create.mockResolvedValue(mockResponse);

    const options = AnthropicChatOptions.builder()
      .httpHeaders({
        "X-Custom-Header": "custom-value",
        "X-Request-Id": "req-123",
      })
      .build();

    const response = await chatModel.call(new Prompt("Hello", options));

    assert.exists(response);

    expect(create).toHaveBeenCalledTimes(1);
    const requestOptions = create.mock.calls[0]?.[1] as {
      headers?: Record<string, string>;
    };
    expect(requestOptions.headers).toMatchObject({
      "X-Custom-Header": "custom-value",
      "X-Request-Id": "req-123",
    });
  });

  it("call with skill container wires additional body and beta headers", async () => {
    const mockResponse = createMockMessage("Created spreadsheet", "end_turn");
    create.mockResolvedValue(mockResponse);

    const options = AnthropicChatOptions.builder()
      .skill(AnthropicSkill.XLSX)
      .internalToolExecutionEnabled(false)
      .build();

    const response = await chatModel.call(
      new Prompt("Create an Excel file", options),
    );

    assert.exists(response);

    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0]?.[0] as MessageCreateParams;
    const requestOptions = create.mock.calls[0]?.[1] as {
      headers?: Record<string, string>;
    };

    // Verify beta headers are set for skills
    assert.exists(requestOptions.headers);
    assert.exists(requestOptions.headers["anthropic-beta"]);
    const betaHeader = requestOptions.headers["anthropic-beta"];
    expect(betaHeader).toContain("skills-2025-10-02");
    expect(betaHeader).toContain("code-execution-2025-08-25");
    expect(betaHeader).toContain("files-api-2025-04-14");
    // Verify container body property is set
    assert.exists(Reflect.get(request, "container"));
  });
});

function createMockMessage(text: string, stopReason: string): AnthropicMessage {
  return {
    id: "msg_123",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "text",
        text,
      },
    ],
    stop_reason: stopReason,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
    },
  } as AnthropicMessage;
}

function createMockMessageWithToolUse(
  toolId: string,
  toolName: string,
  input: Record<string, unknown>,
  stopReason: string,
): AnthropicMessage {
  return {
    id: "msg_456",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "tool_use",
        id: toolId,
        name: toolName,
        input,
      } as ToolUseBlock,
    ],
    stop_reason: stopReason,
    usage: {
      input_tokens: 15,
      output_tokens: 25,
    },
  } as AnthropicMessage;
}
