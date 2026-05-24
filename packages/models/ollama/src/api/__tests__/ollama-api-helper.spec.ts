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

import { describe, expect, it } from "vitest";

import { OllamaApi } from "../ollama-api.js";
import { OllamaApiHelper } from "../ollama-api-helper.js";

/**
 * Tests for {@link OllamaApiHelper}
 */
describe("OllamaApiHelper", () => {
  const toolCall: OllamaApi.Message.ToolCall = {
    function: {
      name: "tool",
      arguments: {},
    },
  };

  const assistantMessage = (
    overrides: Partial<OllamaApi.Message> = {},
  ): OllamaApi.Message =>
    ({
      role: OllamaApi.Message.Role.ASSISTANT,
      ...overrides,
    }) as OllamaApi.Message;

  const response = (
    overrides: Partial<OllamaApi.ChatResponse>,
  ): OllamaApi.ChatResponse =>
    ({
      model: "model",
      created_at: "2025-01-01T00:00:00.000Z",
      message: assistantMessage(),
      ...overrides,
    }) as OllamaApi.ChatResponse;

  it("is streaming tool call when response is null should return false", () => {
    expect(OllamaApiHelper.isStreamingToolCall(null)).toBe(false);
  });

  it("is streaming tool call when message is null should return false", () => {
    const chatResponse = {
      message: null,
    } as unknown as OllamaApi.ChatResponse;

    expect(OllamaApiHelper.isStreamingToolCall(chatResponse)).toBe(false);
  });

  it("is streaming tool call when tool calls is null should return false", () => {
    const chatResponse = response({
      message: assistantMessage({ tool_calls: null }),
    });

    expect(OllamaApiHelper.isStreamingToolCall(chatResponse)).toBe(false);
  });

  it("is streaming tool call when tool calls is empty should return false", () => {
    const chatResponse = response({
      message: assistantMessage({ tool_calls: [] }),
    });

    expect(OllamaApiHelper.isStreamingToolCall(chatResponse)).toBe(false);
  });

  it("is streaming tool call when tool calls has elements should return true", () => {
    const chatResponse = response({
      message: assistantMessage({ tool_calls: [toolCall] }),
    });

    expect(OllamaApiHelper.isStreamingToolCall(chatResponse)).toBe(true);
  });

  it("is streaming done when response is null should return false", () => {
    expect(OllamaApiHelper.isStreamingDone(null)).toBe(false);
  });

  it("is streaming done when done is false should return false", () => {
    expect(
      OllamaApiHelper.isStreamingDone(
        response({
          done: false,
        }),
      ),
    ).toBe(false);
  });

  it("is streaming done when done reason is not stop should return false", () => {
    expect(
      OllamaApiHelper.isStreamingDone(
        response({
          done: true,
          done_reason: "other",
        }),
      ),
    ).toBe(false);
  });

  it("is streaming done when done is true and done reason is stop should return true", () => {
    expect(
      OllamaApiHelper.isStreamingDone(
        response({
          done: true,
          done_reason: "stop",
        }),
      ),
    ).toBe(true);
  });

  it("merge when both responses have values should merge correctly", () => {
    const previousCreatedAt = "2025-01-01T00:00:00.000Z";
    const currentCreatedAt = "2025-01-01T00:00:10.000Z";

    const previous = {
      model: "previous-model",
      created_at: previousCreatedAt,
      message: assistantMessage({
        content: "Previous content",
        thinking: "Previous thinking",
        images: ["image1"],
        tool_calls: [toolCall],
        tool_name: "Previous tool",
      }),
      done_reason: "previous-reason",
      done: false,
      total_duration: 100,
      load_duration: 50,
      prompt_eval_count: 10,
      prompt_eval_duration: 200,
      eval_count: 5,
      eval_duration: 100,
    } as OllamaApi.ChatResponse;

    const current = {
      model: "current-model",
      created_at: currentCreatedAt,
      message: {
        role: OllamaApi.Message.Role.USER,
        content: "Current content",
        thinking: "Current thinking",
        images: ["image2"],
        tool_calls: [toolCall],
        tool_name: "Current tool",
      },
      done_reason: "stop",
      done: true,
      total_duration: 200,
      load_duration: 100,
      prompt_eval_count: 20,
      prompt_eval_duration: 400,
      eval_count: 10,
      eval_duration: 200,
    } as OllamaApi.ChatResponse;

    const result = OllamaApiHelper.merge(previous, current);

    expect(result.model).toBe("previous-modelcurrent-model");
    expect(result.created_at).toBe(currentCreatedAt);
    expect(result.message.content).toBe("Previous contentCurrent content");
    expect(result.message.thinking).toBe("Previous thinkingCurrent thinking");
    expect(result.message.role).toBe(OllamaApi.Message.Role.USER);
    expect(result.message.images).toEqual(["image1", "image2"]);
    expect(result.message.tool_calls).toHaveLength(2);
    expect(result.message.tool_name).toBe("Previous toolCurrent tool");
    expect(result.done_reason).toBe("stop");
    expect(result.done).toBe(true);
    expect(result.total_duration).toBe(300);
    expect(result.load_duration).toBe(150);
    expect(result.prompt_eval_count).toBe(30);
    expect(result.prompt_eval_duration).toBe(600);
    expect(result.eval_count).toBe(15);
    expect(result.eval_duration).toBe(300);
  });

  it("merge strings should concatenate", () => {
    const previous = {
      model: "model1",
      created_at: "2025-01-01T00:00:00.000Z",
      message: assistantMessage({
        content: "Hello",
        thinking: "Think",
        tool_name: "Tool",
      }),
      done_reason: "reason1",
      done: false,
    } as OllamaApi.ChatResponse;

    const current = {
      model: "model2",
      created_at: "2025-01-01T00:00:10.000Z",
      message: assistantMessage({
        content: " World",
        thinking: "ing",
        tool_name: "Box",
      }),
      done_reason: "reason2",
      done: true,
    } as OllamaApi.ChatResponse;

    const result = OllamaApiHelper.merge(previous, current);

    expect(result.model).toBe("model1model2");
    expect(result.message.content).toBe("Hello World");
    expect(result.message.thinking).toBe("Thinking");
    expect(result.message.tool_name).toBe("ToolBox");
    expect(result.done_reason).toBe("reason2");
    expect(result.done).toBe(true);
  });

  it("merge numbers should sum", () => {
    const previous = {
      model: "model",
      created_at: "2025-01-01T00:00:00.000Z",
      message: assistantMessage(),
      total_duration: 100,
      load_duration: 50,
      prompt_eval_count: 10,
      prompt_eval_duration: 200,
      eval_count: 5,
      eval_duration: 100,
    } as OllamaApi.ChatResponse;

    const current = {
      model: "model",
      created_at: "2025-01-01T00:00:10.000Z",
      message: assistantMessage(),
      total_duration: 200,
      load_duration: 100,
      prompt_eval_count: 20,
      prompt_eval_duration: 400,
      eval_count: 10,
      eval_duration: 200,
    } as OllamaApi.ChatResponse;

    const result = OllamaApiHelper.merge(previous, current);

    expect(result.total_duration).toBe(300);
    expect(result.load_duration).toBe(150);
    expect(result.prompt_eval_count).toBe(30);
    expect(result.prompt_eval_duration).toBe(600);
    expect(result.eval_count).toBe(15);
    expect(result.eval_duration).toBe(300);
  });

  it("merge lists should combine", () => {
    const previous = {
      model: "model",
      created_at: "2025-01-01T00:00:00.000Z",
      message: assistantMessage({
        images: ["image1", "image2"],
      }),
    } as OllamaApi.ChatResponse;

    const current = {
      model: "model",
      created_at: "2025-01-01T00:00:10.000Z",
      message: assistantMessage({
        images: ["image3", "image4"],
      }),
    } as OllamaApi.ChatResponse;

    const result = OllamaApiHelper.merge(previous, current);

    expect(result.message.images).toEqual([
      "image1",
      "image2",
      "image3",
      "image4",
    ]);
  });
});
