import type { ChatModel, StructuredOutputConverter } from "@nestjs-ai/model";
import {
  AssistantMessage,
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
    let capturedPrompt = {} as Prompt;
    const chatResponse = createChatResponse('{"name":"John", "age":30}', true);
    const chatModel = {
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("Tell me about John")
      .call()
      .responseEntity(MyBeanSchema);

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.response?.metadata.get("key1")).toBe("value1");
    expect(responseEntity.entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });

  it("parametrized response entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createChatResponse(`
				[
					{"name":"Max", "age":10},
					{"name":"Adi", "age":13}
				]
				`);
    const chatModel = {
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("Tell me about them")
      .call()
      .responseEntity(MyBeanListSchema);

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.entity?.[0]).toEqual({ name: "Max", age: 10 });
    expect(responseEntity.entity?.[1]).toEqual({ name: "Adi", age: 13 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about them");
  });

  it("custom so c response entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createChatResponse(`
					{"name":"Max", "age":10}
				`);
    const chatModel = {
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("Tell me about Max")
      .call()
      .responseEntity(new MapOutputConverter());

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.entity?.name).toBe("Max");
    expect(responseEntity.entity?.age).toBe(10);

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about Max");
  });

  it("when empty response content then handle gracefully", async () => {
    const chatResponse = createChatResponse("");
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    await expect(
      ChatClient.builder(chatModel)
        .build()
        .prompt()
        .user("test")
        .call()
        .responseEntity(MyBeanSchema),
    ).rejects.toThrow();
  });

  it("when invalid json response then throws", async () => {
    const chatResponse = createChatResponse("invalid json content");
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    await expect(
      ChatClient.builder(chatModel)
        .build()
        .prompt()
        .user("test")
        .call()
        .responseEntity(MyBeanSchema),
    ).rejects.toThrow();
  });

  it("when parameterized type with map then parse correctly", async () => {
    const chatResponse = createChatResponse(`
				{
					"key1": "value1",
					"key2": "value2",
					"key3": "value3"
				}
				`);
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
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
    const chatResponse = createChatResponse("[]");
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("test")
      .call()
      .responseEntity(MyBeanListSchema);

    expect(responseEntity.entity).toEqual([]);
  });

  it("when boolean primitive response then parse correctly", async () => {
    const chatResponse = createChatResponse("true");
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("Is this true?")
      .call()
      .responseEntity(new BooleanOutputConverter());

    expect(responseEntity.entity).toBe(true);
  });

  it("when integer response then parse correctly", async () => {
    const chatResponse = createChatResponse("1");
    const chatModel = {
      call: vi.fn(async () => chatResponse),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const responseEntity = await ChatClient.builder(chatModel)
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
