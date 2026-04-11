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

import type { Media } from "@nestjs-ai/commons";
import {
  type ChatModel,
  ChatOptions,
  DefaultToolCallingChatOptions,
  type Message,
  SystemMessage,
  ToolCallback,
  type ToolCallingChatOptions,
  ToolDefinition,
  ToolMetadata,
  UserMessage,
} from "@nestjs-ai/model";
import { StTemplateRenderer } from "@nestjs-ai/template-st";
import { describe, expect, it } from "vitest";

import { ChatClient } from "../chat-client";
import type { DefaultChatClient } from "../default-chat-client";
import { DefaultChatClientUtils } from "../default-chat-client-utils";

function asRequestSpec(
  spec: ChatClient.ChatClientRequestSpec,
): DefaultChatClient.DefaultChatClientRequestSpec {
  return spec as unknown as DefaultChatClient.DefaultChatClientRequestSpec;
}

function toChatClientRequest(
  spec: DefaultChatClient.DefaultChatClientRequestSpec,
) {
  return DefaultChatClientUtils.toChatClientRequest(spec);
}

function createChatModel(
  defaultOptions: ChatOptions = ChatOptions.builder().build(),
): ChatModel {
  return {
    defaultOptions,
  } as unknown as ChatModel;
}

class TestToolCallback extends ToolCallback {
  private readonly _toolDefinition;

  private readonly _toolMetadata: ToolMetadata;

  constructor(
    private readonly _name: string,
    returnDirect = false,
  ) {
    super();
    this._toolDefinition = ToolDefinition.builder()
      .name(this._name)
      .inputSchema("{}")
      .build();
    this._toolMetadata = ToolMetadata.create({ returnDirect });
  }

  override get toolDefinition() {
    return this._toolDefinition;
  }

  override get toolMetadata() {
    return this._toolMetadata;
  }

  override async call(_toolInput: string): Promise<string> {
    return "Mission accomplished!";
  }
}

describe("DefaultChatClientUtils", () => {
  it("when input request is null then throws", () => {
    expect(() =>
      DefaultChatClientUtils.toChatClientRequest(
        null as unknown as DefaultChatClient.DefaultChatClientRequestSpec,
      ),
    ).toThrow("inputRequest cannot be null");
  });

  it("when system text is provided then system message is added to prompt", () => {
    const systemText = "System instructions";
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel()).prompt().system(systemText),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(result.prompt.instructions[0]?.text).toBe(systemText);
  });

  it("when system text with params is provided then system message is rendered and added to prompt", () => {
    const systemText = "System instructions for {name}";
    const systemParams = new Map<string, unknown>([["name", "Spring AI"]]);
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .system((s) => s.text(systemText).params(systemParams)),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(result.prompt.instructions[0]?.text).toBe(
      "System instructions for Spring AI",
    );
  });

  it("when messages are provided then they are added to prompt", () => {
    const messages: Message[] = [
      new SystemMessage({ content: "System message" }),
      new UserMessage({ content: "User message" }),
    ];
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel()).prompt().messages(messages),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).toHaveLength(2);
    expect(result.prompt.instructions[0]?.text).toBe("System message");
    expect(result.prompt.instructions[1]?.text).toBe("User message");
  });

  it("when user text is provided then user message is added to prompt", () => {
    const userText = "User question";
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel()).prompt().user(userText),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(UserMessage);
    expect(result.prompt.instructions[0]?.text).toBe(userText);
  });

  it("when user text with params is provided then user message is rendered and added to prompt", () => {
    const userText = "Question about {topic}";
    const userParams = new Map<string, unknown>([["topic", "Spring AI"]]);
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .user((u) => u.text(userText).params(userParams)),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(UserMessage);
    expect(result.prompt.instructions[0]?.text).toBe(
      "Question about Spring AI",
    );
  });

  it("when user text with media is provided then user message with media is added to prompt", () => {
    const userText = "What's in this image?";
    const media = {} as Media;
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .user((u) => u.text(userText).media(media)),
    );

    const result = toChatClientRequest(inputRequest);
    const userMessage = result.prompt.instructions[0] as UserMessage;

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(UserMessage);
    expect(userMessage.text).toBe(userText);
    expect(userMessage.media).toContain(media);
  });

  it("when system text and system message are provided then system text is first", () => {
    const systemText = "System instructions";
    const messages: Message[] = [
      new SystemMessage({ content: "System message" }),
    ];
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .system(systemText)
        .messages(messages),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).toHaveLength(2);
    expect(result.prompt.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(result.prompt.instructions[0]?.text).toBe(systemText);
  });

  it("when user text and user message are provided then user text is last", () => {
    const userText = "User question";
    const messages: Message[] = [new UserMessage({ content: "User message" })];
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .user(userText)
        .messages(messages),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).toHaveLength(2);
    expect(result.prompt.instructions.at(-1)).toBeInstanceOf(UserMessage);
    expect(result.prompt.instructions.at(-1)?.text).toBe(userText);
  });

  it("when tool calling chat options is provided then tool names are set", () => {
    const chatOptions = DefaultToolCallingChatOptions.builder().build();
    const toolNames = ["tool1", "tool2"];
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolNames(...toolNames),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolNames).toEqual(new Set(toolNames));
  });

  it("when tool calling chat options is provided then tool callbacks are set", () => {
    const chatOptions = DefaultToolCallingChatOptions.builder().build();
    const toolCallback = new TestToolCallback("tool1");
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolCallbacks(toolCallback),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolCallbacks).toContain(toolCallback);
  });

  it("when tool calling chat options is provided then tool context is set", () => {
    const chatOptions = DefaultToolCallingChatOptions.builder().build();
    const toolContext = new Map<string, unknown>([["key", "value"]]);
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolContext(toolContext),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolContext).toMatchObject({ key: "value" });
  });

  it("when tool names and chat options are provided then the tool names override", () => {
    const toolNames1 = new Set(["toolA", "toolB"]);
    const chatOptions = DefaultToolCallingChatOptions.builder()
      .toolNames(toolNames1)
      .build();
    const toolNames2 = ["tool1", "tool2"];
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolNames(...toolNames2),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolNames).toEqual(new Set(toolNames2));
  });

  it("when tool callbacks and chat options are provided then the tool callbacks override", () => {
    const toolCallback1 = new TestToolCallback("tool1");
    const chatOptions = DefaultToolCallingChatOptions.builder()
      .toolCallbacks(toolCallback1)
      .build();
    const toolCallback2 = new TestToolCallback("tool2");
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolCallbacks(toolCallback2),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolCallbacks).toEqual([toolCallback2]);
  });

  it("when tool context and chat options are provided then the values are merged", () => {
    const chatOptions = DefaultToolCallingChatOptions.builder()
      .toolContext({ key1: "value1" })
      .build();
    const toolContext2 = new Map<string, unknown>([["key2", "value2"]]);
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel(chatOptions))
        .prompt()
        .options(chatOptions.mutate())
        .toolContext(toolContext2),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolContext).toMatchObject({
      key1: "value1",
      key2: "value2",
    });
  });

  it("when tool names and chat options are default chat options", () => {
    const toolNames1 = new Set(["toolA", "toolB"]);
    const chatOptions = ChatOptions.builder();
    const inputRequest = asRequestSpec(
      ChatClient.create(
        createChatModel(DefaultToolCallingChatOptions.builder().build()),
      )
        .prompt()
        .options(chatOptions)
        .toolNames(...Array.from(toolNames1)),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolNames).toEqual(toolNames1);
  });

  it("when tool callbacks and chat options are default chat options", () => {
    const toolCallback1 = new TestToolCallback("tool1");
    const chatOptions = ChatOptions.builder();
    const inputRequest = asRequestSpec(
      ChatClient.create(
        createChatModel(DefaultToolCallingChatOptions.builder().build()),
      )
        .prompt()
        .options(chatOptions)
        .toolCallbacks(toolCallback1),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();
    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolCallbacks).toEqual([toolCallback1]);
  });

  it("when tool context and chat options are default chat options", () => {
    const toolContext1 = new Map<string, unknown>([["key1", "value1"]]);
    const chatOptions = ChatOptions.builder();
    const inputRequest = asRequestSpec(
      ChatClient.create(
        createChatModel(DefaultToolCallingChatOptions.builder().build()),
      )
        .prompt()
        .options(chatOptions)
        .toolContext(toolContext1),
    );

    const result = toChatClientRequest(inputRequest);
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolContext).toMatchObject({ key1: "value1" });
  });

  it("when advisor params are provided then they are added to context", () => {
    const advisorParams = new Map<string, unknown>([
      ["key1", "value1"],
      ["key2", "value2"],
    ]);
    const inputRequest = asRequestSpec(
      ChatClient.create(createChatModel())
        .prompt()
        .advisors((a) => a.params(advisorParams)),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(Object.fromEntries(result.context)).toMatchObject({
      key1: "value1",
      key2: "value2",
    });
  });

  it("when custom template renderer is provided then it is used for rendering", () => {
    const systemText = "Instructions <name>";
    const systemParams = new Map<string, unknown>([["name", "Spring AI"]]);
    const customRenderer = new StTemplateRenderer({
      startDelimiterToken: "<",
      endDelimiterToken: ">",
    });
    const inputRequest = asRequestSpec(
      ChatClient.create(
        createChatModel(DefaultToolCallingChatOptions.builder().build()),
      )
        .prompt()
        .system((s) => s.text(systemText).params(systemParams))
        .templateRenderer(customRenderer),
    );

    const result = toChatClientRequest(inputRequest);

    expect(result).toBeDefined();
    expect(result.prompt.instructions).not.toHaveLength(0);
    expect(result.prompt.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(result.prompt.instructions[0]?.text).toBe("Instructions Spring AI");
  });

  it("when all components are provided then complete request is created", () => {
    const systemText = "System instructions for {name}";
    const systemParams = new Map<string, unknown>([["name", "Spring AI"]]);

    const userText = "Question about {topic}";
    const userParams = new Map<string, unknown>([["topic", "Spring AI"]]);
    const media = {} as Media;

    const messages: Message[] = [
      new UserMessage({ content: "Intermediate message" }),
    ];

    const chatOptions = DefaultToolCallingChatOptions.builder().build();
    const toolNames = ["tool1", "tool2"];
    const toolCallback = new TestToolCallback("tool3");
    const toolContext = new Map<string, unknown>([["toolKey", "toolValue"]]);

    const advisorParams = new Map<string, unknown>([
      ["advisorKey", "advisorValue"],
    ]);

    const inputRequest = asRequestSpec(
      ChatClient.create(
        createChatModel(DefaultToolCallingChatOptions.builder().build()),
      )
        .prompt()
        .system((s) => s.text(systemText).params(systemParams))
        .user((u) => u.text(userText).params(userParams).media(media))
        .messages(messages)
        .toolNames(...toolNames)
        .toolCallbacks(toolCallback)
        .toolContext(toolContext)
        .options(chatOptions.mutate())
        .advisors((a) => a.params(advisorParams)),
    );

    const result = toChatClientRequest(inputRequest);
    const instructions = result.prompt.instructions;
    const userMessage = instructions[2] as UserMessage;
    const resultOptions = result.prompt.options as ToolCallingChatOptions;

    expect(result).toBeDefined();

    expect(instructions).toHaveLength(3);
    expect(instructions[0]).toBeInstanceOf(SystemMessage);
    expect(instructions[0]?.text).toBe("System instructions for Spring AI");
    expect(instructions[1]?.text).toBe("Intermediate message");
    expect(instructions[2]).toBeInstanceOf(UserMessage);
    expect(instructions[2]?.text).toBe("Question about Spring AI");
    expect(userMessage.media).toContain(media);

    expect(result.prompt.options).toBeDefined();
    expect(resultOptions).toBeDefined();
    expect(resultOptions.toolNames).toEqual(new Set(toolNames));
    expect(resultOptions.toolCallbacks).toContain(toolCallback);
    expect(resultOptions.toolContext).toMatchObject({ toolKey: "toolValue" });

    expect(Object.fromEntries(result.context)).toMatchObject({
      advisorKey: "advisorValue",
    });
  });
});
