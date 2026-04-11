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

import type { ChatMemory } from "@nestjs-ai/model";
import {
  AssistantMessage,
  type ChatModel,
  ChatResponse,
  DefaultToolCallingChatOptions,
  Generation,
  InMemoryChatMemoryRepository,
  MessageType,
  MessageWindowChatMemory,
  type Prompt,
} from "@nestjs-ai/model";
import { lastValueFrom, type Observable, of, reduce } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { PromptChatMemoryAdvisor } from "../advisor";
import { ChatClient } from "../chat-client";

describe("ChatClientAdvisorTests", () => {
  it("promptChatMemory", async () => {
    let capturedPrompt = {} as Prompt;
    const chatModel = {
      defaultOptions: new DefaultToolCallingChatOptions(),
      call: vi
        .fn(async (prompt: Prompt) => {
          capturedPrompt = prompt;
          return createResponse("Hello John");
        })
        .mockImplementationOnce(async (prompt: Prompt) => {
          capturedPrompt = prompt;
          return createResponse("Hello John");
        })
        .mockImplementationOnce(async (prompt: Prompt) => {
          capturedPrompt = prompt;
          return createResponse("Your name is John");
        }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    // Create a ChatResponseMetadata instance with default values

    // Mock the chatModel to return predefined ChatResponse objects when called

    // Initialize a message window chat memory to store conversation history
    const chatMemory = createChatMemory();

    // Build a ChatClient with default system text and a memory advisor
    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text.")
      .defaultAdvisors(new PromptChatMemoryAdvisor({ chatMemory }))
      .build();

    // Simulate a user prompt and verify the response
    const chatResponse = await chatClient
      .prompt()
      .user("my name is John")
      .call()
      .chatResponse();

    // Assert that the response content matches the expected output
    const content = chatResponse?.result?.output?.text;
    expect(content).toBe("Hello John");

    // Capture and verify the system message instructions
    const systemMessage = capturedPrompt?.instructions[0];
    expect(normalizeWhitespace(systemMessage?.text ?? "")).toBe(
      normalizeWhitespace(`
				Default system text.

				Use the conversation memory from the MEMORY section to provide accurate answers.

				---------------------
				MEMORY:
				---------------------
				`),
    );
    expect(systemMessage?.messageType).toBe(MessageType.SYSTEM);

    // Capture and verify the user message instructions
    const userMessage = capturedPrompt?.instructions[1];
    expect(normalizeWhitespace(userMessage?.text ?? "")).toBe(
      normalizeWhitespace("my name is John"),
    );

    // Simulate another user prompt and verify the response
    const secondContent = await chatClient
      .prompt()
      .user("What is my name?")
      .call()
      .content();

    // Assert that the response content matches the expected output
    expect(secondContent).toBe("Your name is John");

    // Capture and verify the updated system message instructions
    const secondSystemMessage = capturedPrompt?.instructions[0];
    expect(normalizeWhitespace(secondSystemMessage?.text ?? "")).toBe(
      normalizeWhitespace(`
				Default system text.

				Use the conversation memory from the MEMORY section to provide accurate answers.

				---------------------
				MEMORY:
				USER:my name is John
				ASSISTANT:Hello John
				---------------------
				`),
    );
    expect(secondSystemMessage?.messageType).toBe(MessageType.SYSTEM);

    // Capture and verify the updated user message instructions
    const secondUserMessage = capturedPrompt?.instructions[1];
    expect(normalizeWhitespace(secondUserMessage?.text ?? "")).toBe(
      normalizeWhitespace("What is my name?"),
    );
  });

  it("streamingPromptChatMemory", async () => {
    let capturedPrompt = {} as Prompt;
    const chatModel = {
      defaultOptions: new DefaultToolCallingChatOptions(),
      call: vi.fn(),
      stream: vi
        .fn((prompt: Prompt) => {
          capturedPrompt = prompt;
          return of(createResponse("Hello John"));
        })
        .mockImplementationOnce((prompt: Prompt) => {
          capturedPrompt = prompt;
          return of(createResponse("Hello John"));
        })
        .mockImplementationOnce((prompt: Prompt) => {
          capturedPrompt = prompt;
          return of(createResponse("Your name is John"));
        }),
    } as unknown as ChatModel;

    // Mock the chatModel to stream predefined ChatResponse objects

    // Initialize a message window chat memory to store conversation history
    const chatMemory = createChatMemory();

    // Build a ChatClient with default system text and a memory advisor
    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text.")
      .defaultAdvisors(new PromptChatMemoryAdvisor({ chatMemory }))
      .build();

    // Simulate a streaming user prompt and verify the response
    const content = await join(
      chatClient.prompt().user("my name is John").stream().content(),
    );

    // Assert that the streamed content matches the expected output
    expect(content).toBe("Hello John");

    // Capture and verify the system message instructions
    const systemMessage = capturedPrompt?.instructions[0];
    expect(normalizeWhitespace(systemMessage?.text ?? "")).toBe(
      normalizeWhitespace(`
				Default system text.

				Use the conversation memory from the MEMORY section to provide accurate answers.

				---------------------
				MEMORY:
				---------------------
				`),
    );
    expect(systemMessage?.messageType).toBe(MessageType.SYSTEM);

    // Capture and verify the user message instructions
    const userMessage = capturedPrompt?.instructions[1];
    expect(normalizeWhitespace(userMessage?.text ?? "")).toBe(
      normalizeWhitespace("my name is John"),
    );

    // Simulate another streaming user prompt and verify the response
    const secondContent = await join(
      chatClient.prompt().user("What is my name?").stream().content(),
    );

    // Assert that the streamed content matches the expected output
    expect(secondContent).toBe("Your name is John");

    // Capture and verify the updated system message instructions
    const secondSystemMessage = capturedPrompt?.instructions[0];
    expect(normalizeWhitespace(secondSystemMessage?.text ?? "")).toBe(
      normalizeWhitespace(`
				Default system text.

				Use the conversation memory from the MEMORY section to provide accurate answers.

				---------------------
				MEMORY:
				USER:my name is John
				ASSISTANT:Hello John
				---------------------
				`),
    );
    expect(secondSystemMessage?.messageType).toBe(MessageType.SYSTEM);

    // Capture and verify the updated user message instructions
    const secondUserMessage = capturedPrompt?.instructions[1];
    expect(normalizeWhitespace(secondUserMessage?.text ?? "")).toBe(
      normalizeWhitespace("What is my name?"),
    );
  });
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function createChatMemory(): ChatMemory {
  return new MessageWindowChatMemory({
    chatMemoryRepository: new InMemoryChatMemoryRepository(),
  });
}

function createResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}

function join(content$: Observable<string>): Promise<string> {
  return lastValueFrom(content$.pipe(reduce((acc, value) => acc + value, "")));
}
