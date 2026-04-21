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

import type { ChatModel, StructuredOutputConverter } from "@nestjs-ai/model";
import {
  AssistantMessage,
  ChatOptions,
  ChatResponse,
  ChatResponseMetadata,
  Generation,
  MapOutputConverter,
  MessageType,
  type Prompt,
} from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ChatClient } from "../chat-client";

const MyBeanSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const MyBeanListSchema = z.array(MyBeanSchema);
const StringMapSchema = {
  type: "object",
  additionalProperties: {
    type: "string",
  },
} as const;

describe("ChatClient Response Entity Tests", () => {
  it("response entity test", async () => {
    const chatModelState = createChatModel(
      createChatResponse('{"name":"John", "age":30}', true),
    );

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("Tell me about John")
      .call()
      .responseEntity(MyBeanSchema);

    expect(responseEntity.response).toBeDefined();
    expect(responseEntity.response).toBe(chatModelState.mockChatResponse);
    expect(responseEntity.response?.metadata.get("key1")).toBe("value1");
    expect(responseEntity.entity).toEqual({ name: "John", age: 30 });

    const userMessage = chatModelState.capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });

  it("parametrized response entity test", async () => {
    const chatModelState = createChatModel(
      createChatResponse(`
				[
					{"name":"Max", "age":10},
					{"name":"Adi", "age":13}
				]
				`),
    );

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("Tell me about them")
      .call()
      .responseEntity(MyBeanListSchema);

    expect(responseEntity.response).toBe(chatModelState.mockChatResponse);
    expect(responseEntity.entity?.[0]).toEqual({ name: "Max", age: 10 });
    expect(responseEntity.entity?.[1]).toEqual({ name: "Adi", age: 13 });

    const userMessage = chatModelState.capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about them");
  });

  it("custom so c response entity test", async () => {
    const chatModelState = createChatModel(
      createChatResponse(`
					{"name":"Max", "age":10}
				`),
    );

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("Tell me about Max")
      .call()
      .responseEntity(new MapOutputConverter());

    expect(responseEntity.response).toBe(chatModelState.mockChatResponse);
    expect(responseEntity.entity?.name).toBe("Max");
    expect(responseEntity.entity?.age).toBe(10);

    const userMessage = chatModelState.capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about Max");
  });

  it("when empty response content then handle gracefully", async () => {
    const chatModelState = createChatModel(createChatResponse(""));

    await expect(
      ChatClient.builder(chatModelState.chatModel)
        .build()
        .prompt()
        .user("test")
        .call()
        .responseEntity(MyBeanSchema),
    ).rejects.toThrow(
      'Could not parse the given text to the desired target schema: ""',
    );
  });

  it("when invalid json response then throws", async () => {
    const chatModelState = createChatModel(
      createChatResponse("invalid json content"),
    );

    await expect(
      ChatClient.builder(chatModelState.chatModel)
        .build()
        .prompt()
        .user("test")
        .call()
        .responseEntity(MyBeanSchema),
    ).rejects.toThrow(
      'Could not parse the given text to the desired target schema: "invalid json content"',
    );
  });

  it("when parameterized type with map then parse correctly", async () => {
    const chatModelState = createChatModel(
      createChatResponse(`
				{
					"key1": "value1",
					"key2": "value2",
					"key3": "value3"
				}
				`),
    );

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("test")
      .call()
      .responseEntity(StringMapSchema);

    expect(responseEntity.entity).toMatchObject({
      key1: "value1",
      key2: "value2",
      key3: "value3",
    });
  });

  it("when empty array response then return empty list", async () => {
    const chatModelState = createChatModel(createChatResponse("[]"));

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("test")
      .call()
      .responseEntity(MyBeanListSchema);

    expect(responseEntity.entity).toEqual([]);
  });

  it("when boolean primitive response then parse correctly", async () => {
    const chatModelState = createChatModel(createChatResponse("true"));

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("Is this true?")
      .call()
      .responseEntity(new BooleanOutputConverter());

    expect(responseEntity.entity).toBe(true);
  });

  it("when integer response then parse correctly", async () => {
    const chatModelState = createChatModel(createChatResponse("1"));

    const responseEntity = await ChatClient.builder(chatModelState.chatModel)
      .build()
      .prompt()
      .user("What is the answer?")
      .call()
      .responseEntity(new NumberOutputConverter());

    expect(responseEntity.entity).toBe(1);
  });
});

class BooleanOutputConverter implements StructuredOutputConverter<boolean> {
  get format(): string {
    return "";
  }

  convert(source: string): boolean {
    return JSON.parse(source) as boolean;
  }
}

class NumberOutputConverter implements StructuredOutputConverter<number> {
  get format(): string {
    return "";
  }

  convert(source: string): number {
    return JSON.parse(source) as number;
  }
}

function createChatModel(mockChatResponse: ChatResponse): {
  capturedPrompt: Prompt;
  mockChatResponse: ChatResponse;
  chatModel: ChatModel;
} {
  const state = {
    capturedPrompt: {} as Prompt,
    mockChatResponse,
  };
  const defaultOptions = ChatOptions.builder().build();

  const chatModel = {
    defaultOptions,
    getDefaultOptions: vi.fn(() => defaultOptions),
    call: vi.fn(async (prompt: Prompt) => {
      state.capturedPrompt = prompt;
      return state.mockChatResponse;
    }),
    stream: vi.fn(),
  } as unknown as ChatModel;

  return {
    get capturedPrompt() {
      return state.capturedPrompt;
    },
    get mockChatResponse() {
      return state.mockChatResponse;
    },
    chatModel,
  };
}

function createChatResponse(
  content: string,
  withMetadata = false,
): ChatResponse {
  const metadata = withMetadata
    ? ChatResponseMetadata.builder().keyValue("key1", "value1").build()
    : undefined;

  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
    chatResponseMetadata: metadata,
  });
}
