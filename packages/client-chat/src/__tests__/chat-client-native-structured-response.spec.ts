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
  DefaultToolCallingChatOptions,
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

type StructuredOutputChatOptionsBuilder = ChatOptions.Builder & {
  outputSchema(outputSchema: string | null): ChatOptions.Builder;
};

describe("ChatClient Native Structured Response Tests", () => {
  it("fallback entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      defaultOptions: new TestStructuredOutputChatOptions(),
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
      .options(structuredOutputChatOptions.mutate())
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

  it("fallback response entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      defaultOptions: new TestStructuredOutputChatOptions(),
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
      .options(structuredOutputChatOptions.mutate())
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
      defaultOptions: new TestStructuredOutputChatOptions(),
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
      .options(structuredOutputChatOptions.mutate())
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

  it("native response entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      defaultOptions: new TestStructuredOutputChatOptions(),
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
      .options(structuredOutputChatOptions.mutate())
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
    expect(userMessage?.text).toBe("Tell me about John");
  });

  it("dynamic disable native response entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      defaultOptions: new TestStructuredOutputChatOptions(),
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
      .options(structuredOutputChatOptions.mutate())
      .advisors((advisorSpec) =>
        advisorSpec.param(
          ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key,
          false,
        ),
      )
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .responseEntity(UserEntitySchema, UserEntity);

    const context = textCallAdvisor.context;

    expect(context.get(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      false,
    );
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      false,
    );

    expect(responseEntity.response).toBe(chatResponse);
    expect(responseEntity.entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });

  it("dynamic disable native entity test", async () => {
    let capturedPrompt = {} as Prompt;
    const chatResponse = createResponse('{"name":"John", "age":30}');
    const chatModel = {
      defaultOptions: new TestStructuredOutputChatOptions(),
      call: vi.fn(async (prompt: Prompt) => {
        capturedPrompt = prompt;
        return chatResponse;
      }),
      stream: vi.fn(),
    } as unknown as ChatModel;

    const structuredOutputChatOptions = new TestStructuredOutputChatOptions();
    const textCallAdvisor = new ContextCatcherCallAdvisor();

    const entity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions.mutate())
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .advisors((advisorSpec) =>
        advisorSpec.param(
          ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key,
          false,
        ),
      )
      .user("Tell me about John")
      .call()
      .entity(UserEntitySchema, UserEntity);

    const context = textCallAdvisor.context;

    expect(context.has(ChatClientAttributes.OUTPUT_FORMAT.key)).toBe(true);
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      false,
    );
    expect(context.get(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      false,
    );

    expect(entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
  });
});

class TestStructuredOutputChatOptions
  extends DefaultToolCallingChatOptions
  implements StructuredOutputChatOptions
{
  private _outputSchema = "";

  override copy(): ChatOptions {
    const copy = new TestStructuredOutputChatOptions();
    copy.setOutputSchema(this._outputSchema);
    copy.setToolCallbacks(this.toolCallbacks);
    copy.setToolNames(this.toolNames);
    copy.setToolContext(this.toolContext);
    copy.setInternalToolExecutionEnabled(this.internalToolExecutionEnabled);
    copy.setModel(this.model);
    copy.setFrequencyPenalty(this.frequencyPenalty);
    copy.setMaxTokens(this.maxTokens);
    copy.setPresencePenalty(this.presencePenalty);
    copy.setStopSequences(this.stopSequences);
    copy.setTemperature(this.temperature);
    copy.setTopK(this.topK);
    copy.setTopP(this.topP);
    return copy;
  }

  override mutate(): TestStructuredOutputChatOptionsBuilder {
    return new TestStructuredOutputChatOptionsBuilder(this._outputSchema);
  }

  get outputSchema(): string {
    return this._outputSchema;
  }

  setOutputSchema(outputSchema: string): void {
    this._outputSchema = outputSchema;
  }
}

class TestStructuredOutputChatOptionsBuilder
  extends DefaultToolCallingChatOptions.Builder
  implements StructuredOutputChatOptionsBuilder
{
  constructor(private _outputSchema: string) {
    super();
  }

  outputSchema(outputSchema: string | null): this {
    this._outputSchema = outputSchema ?? "";
    return this;
  }

  override build(): TestStructuredOutputChatOptions {
    const options = new TestStructuredOutputChatOptions();
    options.setOutputSchema(this._outputSchema);
    return options;
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
