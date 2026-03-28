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

import type {
  ChatModel,
  ChatOptions,
  StructuredOutputChatOptions,
} from "@nestjs-ai/model";
import {
  AssistantMessage,
  ChatResponse,
  ChatResponseMetadata,
  Generation,
  MessageType,
  type Prompt,
} from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { CallAdvisor, CallAdvisorChain } from "../advisor";
import { AdvisorParams } from "../advisor-params";
import { ChatClient } from "../chat-client";
import { ChatClientAttributes } from "../chat-client-attributes";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";

describe("ChatClient Native Structured Response Tests", () => {
  it("fallback entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const structuredOutputChatOptions = new TestStructuredOutputChatOptions();
    const textCallAdvisor = new ContextCatcherCallAdvisor();

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .responseEntity(UserEntitySchema, UserEntity);

    const context = textCallAdvisor.context;

    expect(context.has(ChatClientAttributes.OUTPUT_FORMAT.key)).toBe(true);
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      false,
    );
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      false,
    );

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.response?.metadata.get("key1")).toBe("value1");
    expect(responseEntity.entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });

  it("native entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const structuredOutputChatOptions = new TestStructuredOutputChatOptions();
    const textCallAdvisor = new ContextCatcherCallAdvisor();

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions)
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .responseEntity(UserEntitySchema, UserEntity);

    const context = textCallAdvisor.context;

    expect(context.has(ChatClientAttributes.OUTPUT_FORMAT.key)).toBe(true);
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      true,
    );
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      true,
    );

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.response?.metadata.get("key1")).toBe("value1");
    expect(responseEntity.entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });
});

class TestStructuredOutputChatOptions implements StructuredOutputChatOptions {
  private _outputSchema = "";

  copy(): ChatOptions {
    const copy = new TestStructuredOutputChatOptions();
    copy.outputSchema = this._outputSchema;
    return copy;
  }

  get outputSchema(): string {
    return this._outputSchema;
  }

  set outputSchema(outputSchema: string) {
    this._outputSchema = outputSchema;
  }
}

class UserEntity {
  name = "";
  age = 0;
}

const UserEntitySchema = z.object({
  name: z.string(),
  age: z.number(),
});

class ContextCatcherCallAdvisor implements CallAdvisor {
  private _context = new Map<string, unknown>();

  get name(): string {
    return "TestAdvisor";
  }

  get order(): number {
    return 0;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    const response = await callAdvisorChain.nextCall(chatClientRequest);
    this._context = new Map(response.context);
    return response;
  }

  get context(): Map<string, unknown> {
    return this._context;
  }
}

function createResponse(content: string): ChatResponse {
  const metadata = ChatResponseMetadata.builder()
    .keyValue("key1", "value1")
    .build();
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
    chatResponseMetadata: metadata,
  });
}
