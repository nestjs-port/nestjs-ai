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

import { describe, expect, it, vi } from "vitest";
import { AssistantMessage } from "../../messages";
import { Prompt } from "../../prompt";
import { ChatModel } from "../chat-model";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";

/**
 * Test implementation of ChatModel for testing purposes.
 * This is a common pattern for testing abstract classes in vitest.
 */
class TestChatModel extends ChatModel {
  protected async callPrompt(_prompt: Prompt): Promise<ChatResponse> {
    // Default implementation - `call` is mocked using vi.spyOn()
    throw new Error("chatPrompt method should not be called directly");
  }
}

/**
 * Helper function to create a mock ChatResponse with the given text.
 */
function createMockResponse(responseText: string | null): ChatResponse {
  const mockAssistantMessage = new AssistantMessage({
    content: responseText,
    media: [],
  });

  const generation = new Generation({
    assistantMessage: mockAssistantMessage,
  });

  return new ChatResponse({
    generations: [generation],
  });
}

describe("ChatModel", () => {
  function spyOnChatPrompt(chatModel: TestChatModel) {
    return vi.spyOn(chatModel, "callPrompt" as "call");
  }

  it("generate with string calls generate with prompt and returns response correctly", async () => {
    const userMessage = "Zero Wing";
    const responseMessage = "All your bases are belong to us";

    const response = createMockResponse(responseMessage);

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockImplementation(
      (prompt: Prompt) => {
        expect(prompt).toBeDefined();
        expect(prompt.contents).toBe(userMessage);
        return Promise.resolve(response);
      },
    );

    const result = await chatModel.call(userMessage);

    expect(result).toBe(responseMessage);
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
  });

  it("generate with empty string returns empty response", async () => {
    const userMessage = "";
    const responseMessage = "";

    const response = createMockResponse(responseMessage);

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(response);

    const result = await chatModel.call(userMessage);

    expect(result).toBe(responseMessage);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate with whitespace only string handles correctly", async () => {
    const userMessage = "   \t\n   ";
    const responseMessage = "I received whitespace input";

    const response = createMockResponse(responseMessage);

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(response);

    const result = await chatModel.call(userMessage);

    expect(result).toBe(responseMessage);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate when prompt call throws exception propagates correctly", async () => {
    const userMessage = "Test message";
    const expectedException = new Error("API call failed");

    const chatModel = new TestChatModel();
    const callSpy =
      spyOnChatPrompt(chatModel).mockRejectedValue(expectedException);

    await expect(chatModel.call(userMessage)).rejects.toThrow(
      expectedException,
    );

    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate when response is null handles gracefully", async () => {
    const userMessage = "Test message";

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(
      null as unknown as ChatResponse,
    );

    await expect(chatModel.call(userMessage)).rejects.toThrow();

    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate when assistant message is null handles gracefully", async () => {
    const userMessage = "Test message";

    // Create a response with a generation that has null text
    const mockAssistantMessage = new AssistantMessage({
      content: null,
      media: [],
    });
    const generation = new Generation({
      assistantMessage: mockAssistantMessage,
    });
    const response = new ChatResponse({
      generations: [generation],
    });

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(response);

    const result = await chatModel.call(userMessage);

    expect(result).toBeNull();
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate when assistant message text is null returns null", async () => {
    const userMessage = "Test message";

    const response = createMockResponse(null);

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(response);

    const result = await chatModel.call(userMessage);

    expect(result).toBeNull();
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate with multiline string handles correctly", async () => {
    const userMessage = "Line 1\nLine 2\r\nLine 3\rLine 4";
    const responseMessage = "Multiline input processed";

    const response = createMockResponse(responseMessage);

    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel).mockResolvedValue(response);

    const result = await chatModel.call(userMessage);

    expect(result).toBe(responseMessage);
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("generate multiple times with same client maintains state", async () => {
    const chatModel = new TestChatModel();
    const callSpy = spyOnChatPrompt(chatModel);

    // First call
    callSpy.mockResolvedValueOnce(createMockResponse("Response 1"));
    const result1 = await chatModel.call("Message 1");
    expect(result1).toBe("Response 1");

    // Second call
    callSpy.mockResolvedValueOnce(createMockResponse("Response 2"));
    const result2 = await chatModel.call("Message 2");
    expect(result2).toBe("Response 2");

    expect(callSpy).toHaveBeenCalledTimes(2);
  });
});
