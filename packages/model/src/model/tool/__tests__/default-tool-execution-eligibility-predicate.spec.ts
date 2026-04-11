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
import {
  AssistantMessage,
  type ChatOptions,
  ChatResponse,
  DefaultChatOptions,
  Generation,
  type ToolCall,
} from "../../../chat";
import type { ToolCallback } from "../../../tool";
import { DefaultToolExecutionEligibilityPredicate } from "../default-tool-execution-eligibility-predicate";
import type { ToolCallingChatOptions } from "../tool-calling-chat-options.interface";

describe("DefaultToolExecutionEligibilityPredicate", () => {
  const predicate = new DefaultToolExecutionEligibilityPredicate();

  function createToolCallingChatOptions(
    internalToolExecutionEnabled: boolean | null,
  ): ToolCallingChatOptions {
    return {
      DEFAULT_TOOL_EXECUTION_ENABLED: true,
      get toolCallbacks() {
        return [];
      },
      setToolCallbacks(_value: ToolCallback[]) {},
      get toolNames() {
        return new Set();
      },
      setToolNames(_value: Set<string>) {},
      get internalToolExecutionEnabled() {
        return internalToolExecutionEnabled;
      },
      setInternalToolExecutionEnabled(_value: boolean | null) {},
      get toolContext() {
        return {};
      },
      setToolContext(_value: Record<string, unknown>) {},
      mutate(): ChatOptions.Builder {
        throw new Error(
          "mutate() must be overridden to return most concrete Builder",
        );
      },
      copy: () => createToolCallingChatOptions(internalToolExecutionEnabled),
    } as ToolCallingChatOptions;
  }

  it("when tool execution enabled and has tool calls", () => {
    const options = createToolCallingChatOptions(true);

    const toolCall: ToolCall = {
      id: "id1",
      type: "function",
      name: "testTool",
      arguments: "{}",
    };
    const assistantMessage = new AssistantMessage({
      content: "test",
      properties: {},
      toolCalls: [toolCall],
    });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(true);
  });

  it("when tool execution enabled and no tool calls", () => {
    const options = createToolCallingChatOptions(true);

    const assistantMessage = new AssistantMessage({ content: "test" });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when tool execution disabled and has tool calls", () => {
    const options = createToolCallingChatOptions(false);

    const toolCall: ToolCall = {
      id: "id1",
      type: "function",
      name: "testTool",
      arguments: "{}",
    };
    const assistantMessage = new AssistantMessage({
      content: "test",
      properties: {},
      toolCalls: [toolCall],
    });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when tool execution disabled and no tool calls", () => {
    const options = createToolCallingChatOptions(false);

    const assistantMessage = new AssistantMessage({ content: "test" });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when regular chat options and has tool calls", () => {
    const options: ChatOptions = new DefaultChatOptions();

    const toolCall: ToolCall = {
      id: "id1",
      type: "function",
      name: "testTool",
      arguments: "{}",
    };
    const assistantMessage = new AssistantMessage({
      content: "test",
      properties: {},
      toolCalls: [toolCall],
    });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(true);
  });

  it("when null chat response", () => {
    const options = createToolCallingChatOptions(true);

    const result = predicate.test(options, null as unknown as ChatResponse);
    expect(result).toBe(false);
  });

  it("when empty generations list", () => {
    const options = createToolCallingChatOptions(true);

    const chatResponse = new ChatResponse({ generations: [] });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when multiple generations with mixed tool calls", () => {
    const options = createToolCallingChatOptions(true);

    const toolCall: ToolCall = {
      id: "id1",
      type: "function",
      name: "testTool",
      arguments: "{}",
    };
    const messageWithToolCall = new AssistantMessage({
      content: "test1",
      properties: {},
      toolCalls: [toolCall],
    });
    const messageWithoutToolCall = new AssistantMessage({ content: "test2" });

    const chatResponse = new ChatResponse({
      generations: [
        new Generation({ assistantMessage: messageWithToolCall }),
        new Generation({ assistantMessage: messageWithoutToolCall }),
      ],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(true);
  });

  it("when multiple generations without tool calls", () => {
    const options = createToolCallingChatOptions(true);

    const message1 = new AssistantMessage({ content: "test1" });
    const message2 = new AssistantMessage({ content: "test2" });

    const chatResponse = new ChatResponse({
      generations: [
        new Generation({ assistantMessage: message1 }),
        new Generation({ assistantMessage: message2 }),
      ],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when assistant message has empty tool calls list", () => {
    const options = createToolCallingChatOptions(true);

    const assistantMessage = new AssistantMessage({
      content: "test",
      properties: {},
      toolCalls: [],
    });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(false);
  });

  it("when multiple tool calls present", () => {
    const options = createToolCallingChatOptions(true);

    const toolCall1: ToolCall = {
      id: "id1",
      type: "function",
      name: "testTool1",
      arguments: "{}",
    };
    const toolCall2: ToolCall = {
      id: "id2",
      type: "function",
      name: "testTool2",
      arguments: '{"param": "value"}',
    };
    const assistantMessage = new AssistantMessage({
      content: "test",
      properties: {},
      toolCalls: [toolCall1, toolCall2],
    });
    const chatResponse = new ChatResponse({
      generations: [new Generation({ assistantMessage })],
    });

    const result = predicate.test(options, chatResponse);
    expect(result).toBe(true);
  });
});
