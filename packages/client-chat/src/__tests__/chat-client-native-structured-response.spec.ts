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
  StructuredOutputConverter,
  type Prompt,
} from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { CallAdvisor } from "../advisor/api/call-advisor.interface.js";
import type { CallAdvisorChain } from "../advisor/api/call-advisor-chain.interface.js";
import { AdvisorParams } from "../advisor-params.js";
import { ChatClient } from "../chat-client.js";
import { ChatClientAttributes } from "../chat-client-attributes.js";
import type { ChatClientRequest } from "../chat-client-request.js";
import type { ChatClientResponse } from "../chat-client-response.js";

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
      .responseEntity(UserEntitySchema);

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
      .responseEntity(UserEntitySchema);

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
      .responseEntity(UserEntitySchema);

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
      .responseEntity(UserEntitySchema);

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

  it("native custom output converter response entity test", async () => {
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
    const outputConverter = new CustomJsonSchemaOutputConverter(
      USER_JSON_SCHEMA,
    );

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions.mutate())
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .responseEntity(outputConverter);

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

  it("native custom output converter without json schema response entity test", async () => {
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
    const outputConverter = new CustomJsonSchemaOutputConverter(
      StructuredOutputConverter.NO_JSON_SCHEMA,
    );
    const setOutputSchemaSpy = vi.spyOn(
      structuredOutputChatOptions,
      "setOutputSchema",
    );

    const responseEntity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions.mutate())
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .responseEntity(outputConverter);

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
    expect(userMessage?.text).toContain(
      "Your response should be in JSON format",
    );
    expect(setOutputSchemaSpy).not.toHaveBeenCalled();
  });

  it("native custom output converter entity test", async () => {
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
    const outputConverter = new CustomJsonSchemaOutputConverter(
      USER_JSON_SCHEMA,
    );

    const entity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions.mutate())
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .entity(outputConverter);

    const context = textCallAdvisor.context;

    expect(context.has(ChatClientAttributes.OUTPUT_FORMAT.key)).toBe(true);
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      true,
    );
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      true,
    );

    expect(entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toBe("Tell me about John");
  });

  it("native custom output converter without json schema entity test", async () => {
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
    const outputConverter = new CustomJsonSchemaOutputConverter(
      StructuredOutputConverter.NO_JSON_SCHEMA,
    );
    const setOutputSchemaSpy = vi.spyOn(
      structuredOutputChatOptions,
      "setOutputSchema",
    );

    const entity = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .options(structuredOutputChatOptions.mutate())
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .advisors(textCallAdvisor)
      .user("Tell me about John")
      .call()
      .entity(outputConverter);

    const context = textCallAdvisor.context;

    expect(context.has(ChatClientAttributes.OUTPUT_FORMAT.key)).toBe(true);
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key)).toBe(
      true,
    );
    expect(context.has(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key)).toBe(
      true,
    );

    expect(entity).toEqual({ name: "John", age: 30 });

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage?.messageType).toBe(MessageType.USER);
    expect(userMessage?.text).toContain("Tell me about John");
    expect(userMessage?.text).toContain(
      "Your response should be in JSON format",
    );
    expect(setOutputSchemaSpy).not.toHaveBeenCalled();
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
      .responseEntity(UserEntitySchema);

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
      .entity(UserEntitySchema);

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
    return this;
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
  implements StructuredOutputChatOptions.Builder
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

const UserEntitySchema = z.object({
  name: z.string(),
  age: z.number(),
});

const USER_JSON_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "age": {
      "type": "integer"
    }
  },
  "required": ["name", "age"],
  "additionalProperties": false
}`;

class CustomJsonSchemaOutputConverter extends StructuredOutputConverter<
  Record<string, unknown>
> {
  constructor(private readonly _jsonSchema: string) {
    super();
  }

  get format(): string {
    return `Your response should be in JSON format.
The JSON Schema is:
\`\`\`${this._jsonSchema}\`\`\``;
  }

  override get jsonSchema(): string {
    return this._jsonSchema;
  }

  async convert(source: string): Promise<Record<string, unknown>> {
    return JSON.parse(source) as Record<string, unknown>;
  }
}

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
