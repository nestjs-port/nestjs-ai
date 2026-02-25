import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ObservationRegistry } from "@nestjs-ai/commons";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatModel,
  ChatResponse,
  DefaultToolCallingChatOptions,
  FunctionToolCallback,
  Generation,
  type Message,
  MessageType,
  Prompt,
  SystemMessage,
  type ToolCallingChatOptions,
  UserMessage,
} from "@nestjs-ai/model";
import { lastValueFrom, type Observable, of, reduce } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ChatClient } from "../chat-client";

const mockFunction = (s: string) => s;
const tabbyCatResource = readFileSync(resolve(__dirname, "./tabby-cat.png"));

describe("ChatClient", () => {
  // ChatClient Builder Tests
  it("default system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text")
      .build();

    let content = await chatClient.prompt("What's Spring AI?").call().content();

    expect(content).toBe("response");

    let systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);

    content = await join(
      chatClient.prompt("What's Spring AI?").stream().content(),
    );

    expect(content).toBe("response");

    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);

    // Override the default system text with prompt system
    content = await chatClient
      .prompt("What's Spring AI?")
      .system("Override default system text")
      .call()
      .content();

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Override default system text");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);

    // Streaming
    content = await join(
      chatClient
        .prompt("What's Spring AI?")
        .system("Override default system text")
        .stream()
        .content(),
    );

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Override default system text");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("default system text lambda", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem((s) =>
        s
          .text("Default system text {param1}, {param2}")
          .param("param1", "value1")
          .param("param2", "value2")
          .metadata("metadata1", "svalue1")
          .metadata("metadata2", "svalue2"),
      )
      .build();

    let content = await chatClient.prompt("What's Spring AI?").call().content();

    expect(content).toBe("response");

    let systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text value1, value2");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");

    // Streaming
    content = await join(
      chatClient.prompt("What's Spring AI?").stream().content(),
    );

    expect(content).toBe("response");

    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text value1, value2");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");

    // Override single default system parameter
    content = await chatClient
      .prompt("What's Spring AI?")
      .system((s) => s.param("param1", "value1New"))
      .call()
      .content();

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text value1New, value2");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");

    // Override default system metadata
    content = await chatClient
      .prompt("What's Spring AI?")
      .system((s) => s.metadata("metadata1", "svalue1New"))
      .call()
      .content();

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text value1, value2");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1New");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");

    // streaming
    content = await join(
      chatClient
        .prompt("What's Spring AI?")
        .system((s) => s.param("param1", "value1New"))
        .stream()
        .content(),
    );

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Default system text value1New, value2");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);

    // Override default system text
    content = await chatClient
      .prompt("What's Spring AI?")
      .system((s) =>
        s
          .text("Override default system text {param3}")
          .param("param3", "value3"),
      )
      .call()
      .content();

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Override default system text value3");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");

    // Streaming
    content = await join(
      chatClient
        .prompt("What's Spring AI?")
        .system((s) =>
          s
            .text("Override default system text {param3}")
            .param("param3", "value3")
            .metadata("metadata3", "svalue3"),
        )
        .stream()
        .content(),
    );

    expect(content).toBe("response");
    systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("Override default system text value3");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.metadata1).toBe("svalue1");
    expect(systemMessage.metadata.metadata2).toBe("svalue2");
    expect(systemMessage.metadata.metadata3).toBe("svalue3");
  });

  it("mutate defaults", async () => {
    const options = new DefaultToolCallingChatOptions();
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured, options);

    // @formatter:off
    let chatClient = ChatClient.builder(chatModel)
      .defaultSystem((s) =>
        s
          .text("Default system text {param1}, {param2}")
          .param("param1", "value1")
          .param("param2", "value2")
          .metadata("smetadata1", "svalue1")
          .metadata("smetadata2", "svalue2"),
      )
      .defaultToolNames("fun1", "fun2")
      .defaultToolCallbacks(
        FunctionToolCallback.builder("fun3", mockFunction)
          .description("fun3description")
          .inputType(z.string())
          .build(),
      )
      .defaultUser((u) =>
        u
          .text("Default user text {uparam1}, {uparam2}")
          .param("uparam1", "value1")
          .param("uparam2", "value2")
          .media(MediaFormat.IMAGE_JPEG, tabbyCatResource)
          .metadata("umetadata1", "udata1")
          .metadata("umetadata2", "udata2"),
      )
      .build();
    // @formatter:on

    let content = await chatClient.prompt().call().content();

    expect(content).toBe("response");

    let prompt = captured.value;

    let systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe("Default system text value1, value2");
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    let userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Default user text value1, value2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("udata2");

    let fco = prompt.options as ToolCallingChatOptions;

    expect(Array.from(fco.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2"]),
    );
    expect(fco.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");

    // Streaming
    content = await join(chatClient.prompt().stream().content());

    expect(content).toBe("response");

    prompt = captured.value;

    systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe("Default system text value1, value2");
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Default user text value1, value2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("udata2");

    fco = prompt.options as ToolCallingChatOptions;

    expect(Array.from(fco.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2"]),
    );
    expect(fco.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");

    // mutate builder
    // @formatter:off
    chatClient = chatClient
      .mutate()
      .defaultSystem("Mutated default system text {param1}, {param2}")
      .defaultToolNames("fun4")
      .defaultUser("Mutated default user text {uparam1}, {uparam2}")
      .build();
    // @formatter:on

    content = await chatClient.prompt().call().content();

    expect(content).toBe("response");

    prompt = captured.value;

    systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe(
      "Mutated default system text value1, value2",
    );
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Mutated default user text value1, value2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("udata2");

    fco = prompt.options as ToolCallingChatOptions;

    expect(Array.from(fco.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2", "fun4"]),
    );
    expect(fco.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");

    // Streaming
    content = await join(chatClient.prompt().stream().content());

    expect(content).toBe("response");

    prompt = captured.value;

    systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe(
      "Mutated default system text value1, value2",
    );
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Mutated default user text value1, value2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("udata2");

    fco = prompt.options as ToolCallingChatOptions;

    expect(Array.from(fco.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2", "fun4"]),
    );
    expect(fco.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");
  });

  it("mutate prompt", async () => {
    const options = new DefaultToolCallingChatOptions();
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured, options);

    // @formatter:off
    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem((s) =>
        s
          .text("Default system text {param1}, {param2}")
          .param("param1", "value1")
          .param("param2", "value2")
          .metadata("smetadata1", "svalue1")
          .metadata("smetadata2", "svalue2"),
      )
      .defaultToolNames("fun1", "fun2")
      .defaultToolCallbacks(
        FunctionToolCallback.builder("fun3", mockFunction)
          .description("fun3description")
          .inputType(z.string())
          .build(),
      )
      .defaultUser((u) =>
        u
          .text("Default user text {uparam1}, {uparam2}")
          .param("uparam1", "value1")
          .param("uparam2", "value2")
          .metadata("umetadata1", "udata1")
          .metadata("umetadata2", "udata2")
          .media(MediaFormat.IMAGE_JPEG, tabbyCatResource),
      )
      .build();

    let content = await chatClient
      .prompt()
      .system("New default system text {param1}, {param2}")
      .user((u) =>
        u
          .param("uparam1", "userValue1")
          .param("uparam2", "userValue2")
          .metadata("umetadata2", "userData2"),
      )
      .toolNames("fun5")
      .mutate()
      .build()
      .prompt()
      .call()
      .content();
    // @formatter:on

    expect(content).toBe("response");

    let prompt = captured.value;

    let systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe("New default system text value1, value2");
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    let userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Default user text userValue1, userValue2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("userData2");

    const tco = prompt.options as ToolCallingChatOptions;

    expect(Array.from(tco.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2", "fun5"]),
    );
    expect(tco.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");

    // Streaming
    // @formatter:off
    content = await join(
      chatClient
        .prompt()
        .system("New default system text {param1}, {param2}")
        .user((u) =>
          u
            .param("uparam1", "userValue1")
            .param("uparam2", "userValue2")
            .metadata("umetadata2", "userData2"),
        )
        .toolNames("fun5")
        .mutate()
        .build()
        .prompt()
        .stream()
        .content(),
    );
    // @formatter:on

    expect(content).toBe("response");

    prompt = captured.value;

    systemMessage = prompt.instructions[0] as Message;
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.text).toBe("New default system text value1, value2");
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");
    expect(systemMessage.metadata.smetadata2).toBe("svalue2");

    userMessage = prompt.instructions[1] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("Default user text userValue1, userValue2");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
    expect(userMessage.metadata.umetadata2).toBe("userData2");

    const tcoptions = prompt.options as ToolCallingChatOptions;

    expect(Array.from(tcoptions.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2", "fun5"]),
    );
    expect(tcoptions.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");
  });

  it("default user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel)
      .defaultUser("Default user text")
      .build();

    let content = await chatClient.prompt().call().content();

    expect(content).toBe("response");

    let userMessage = captured.value.instructions[0] as Message;
    expect(userMessage.text).toBe("Default user text");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);

    // Override the default system text with prompt system
    content = await chatClient
      .prompt()
      .user("Override default user text")
      .call()
      .content();

    expect(content).toBe("response");
    userMessage = captured.value.instructions[0] as Message;
    expect(userMessage.text).toBe("Override default user text");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("simple user prompt as string", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt("User prompt")
      .call()
      .content();

    expect(content).toBe("response");

    const userMessage = captured.value.instructions[0] as Message;
    expect(userMessage.text).toBe("User prompt");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("simple user prompt", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("User prompt")
      .call()
      .content();

    expect(content).toBe("response");

    const userMessage = captured.value.instructions[0] as Message;
    expect(userMessage.text).toBe("User prompt");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("simple user prompt object", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const media = new Media({
      mimeType: MediaFormat.IMAGE_JPEG,
      data: tabbyCatResource,
    });

    const message = new UserMessage({
      content: "User prompt",
      media: [media],
      properties: { umetadata1: "udata1" },
    });
    const prompt = new Prompt(message);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt(prompt)
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(1);
    const userMessage = captured.value.instructions[0] as UserMessage;
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.text).toBe("User prompt");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
  });

  it("simple system prompt", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const response = await ChatClient.builder(chatModel)
      .build()
      .prompt("What's Spring AI?")
      .system("System prompt")
      .call()
      .content();

    expect(response).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);

    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("System prompt");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("complex call", async () => {
    const options = DefaultToolCallingChatOptions.builder().build();
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured, options);

    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    // @formatter:off
    const client = ChatClient.builder(chatModel)
      .defaultSystem("System text")
      .defaultToolNames("function1")
      .build();

    const response = await client
      .prompt()
      .user((u) =>
        u
          .text("User text {music}")
          .param("music", "Rock")
          .media(MediaFormat.IMAGE_PNG, url)
          .metadata(new Map([["umetadata1", "udata1"]])),
      )
      .call()
      .content();
    // @formatter:on

    expect(response).toBe("response");
    expect(captured.value.instructions).toHaveLength(2);

    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("System text");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);

    const userMessage = captured.value.instructions[1] as UserMessage;
    expect(userMessage.text).toBe("User text Rock");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    expect(userMessage.media[0]?.data).toBe(url);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.umetadata1).toBe("udata1");

    const runtimeOptions = captured.value.options as ToolCallingChatOptions;

    expect(Array.from(runtimeOptions.toolNames)).toEqual(["function1"]);
    expect(options.toolNames.size).toBe(0);
  });

  // Constructors

  it("when create and chat model is null then throw", () => {
    expect(() => ChatClient.create(null as unknown as ChatModel)).toThrow(
      "chatModel cannot be null",
    );
  });

  it("when create and observation registry is null then throw", () => {
    const chatModel = createChatModel(createCapturedPrompt());
    expect(() =>
      ChatClient.create(
        chatModel,
        null as unknown as ObservationRegistry,
        null,
        null,
      ),
    ).toThrow("observationRegistry cannot be null");
  });

  it("when builder and chat model is null then throw", () => {
    expect(() => ChatClient.builder(null as unknown as ChatModel)).toThrow(
      "chatModel cannot be null",
    );
  });

  it("when builder and observation registry is null then throw", () => {
    const chatModel = createChatModel(createCapturedPrompt());
    expect(() =>
      ChatClient.builder(
        chatModel,
        null as unknown as ObservationRegistry,
        null,
        null,
      ),
    ).toThrow("observationRegistry cannot be null");
  });

  // Prompt Tests - User

  it("when prompt with string content", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const content = await chatClient.prompt("my question").call().content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(1);
    const userMessage = captured.value.instructions[0] as Message;
    expect(userMessage.text).toBe("my question");
    expect(userMessage.messageType).toBe(MessageType.USER);
  });

  it("when prompt with messages", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt([
      new SystemMessage({ content: "instructions" }),
      new UserMessage({ content: "my question" }),
    ]);
    const content = await chatClient.prompt(prompt).call().content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("my question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("when prompt with string content and user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const content = await chatClient
      .prompt("my question")
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("another question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("when prompt with history and user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt([
      new UserMessage({ content: "my question" }),
      new AssistantMessage({ content: "your answer" }),
    ]);
    const content = await chatClient
      .prompt(prompt)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(3);
    const userMessage = captured.value.instructions[2] as Message;
    expect(userMessage.text).toBe("another question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("when prompt with user message and user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt(new UserMessage({ content: "my question" }));
    const content = await chatClient
      .prompt(prompt)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("another question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("when messages with history and user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const messages = [
      new UserMessage({ content: "my question" }),
      new AssistantMessage({ content: "your answer" }),
    ];
    const content = await chatClient
      .prompt()
      .messages(messages)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(3);
    const userMessage = captured.value.instructions[2] as Message;
    expect(userMessage.text).toBe("another question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  it("when messages with user message and user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const messages = [new UserMessage({ content: "my question" })];
    const content = await chatClient
      .prompt()
      .messages(messages)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("another question");
    expect(userMessage.messageType).toBe(MessageType.USER);
    expect(userMessage.metadata.messageType).toBe(MessageType.USER);
  });

  // Prompt Tests - System

  it("when prompt with messages and system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt([
      new UserMessage({ content: "my question" }),
      new AssistantMessage({ content: "your answer" }),
    ]);
    const content = await chatClient
      .prompt(prompt)
      .system("instructions")
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(4);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("when prompt with system message and no system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt([
      new SystemMessage({ content: "instructions" }),
      new UserMessage({ content: "my question" }),
    ]);
    const content = await chatClient
      .prompt(prompt)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(3);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("when prompt with system message and system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const prompt = new Prompt([
      new SystemMessage({ content: "instructions" }),
      new UserMessage({ content: "my question" }),
    ]);
    const content = await chatClient
      .prompt(prompt)
      .system("other instructions")
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(4);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("other instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("when messages and system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const messages = [
      new UserMessage({ content: "my question" }),
      new AssistantMessage({ content: "your answer" }),
    ];
    const content = await chatClient
      .prompt()
      .messages(messages)
      .system("instructions")
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(4);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("when messages with system message and no system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const messages = [
      new SystemMessage({ content: "instructions" }),
      new UserMessage({ content: "my question" }),
    ];
    const content = await chatClient
      .prompt()
      .messages(messages)
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(3);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });

  it("when messages with system message and system text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel).build();
    const messages = [
      new SystemMessage({ content: "instructions" }),
      new UserMessage({ content: "my question" }),
    ];
    const content = await chatClient
      .prompt()
      .messages(messages)
      .system("other instructions")
      .user("another question")
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(4);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("other instructions");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    expect(systemMessage.metadata.messageType).toBe(MessageType.SYSTEM);
  });
});

function createCapturedPrompt(): { value: Prompt } {
  return { value: {} as Prompt };
}

function createChatModel(
  captured: { value: Prompt },
  options?: ToolCallingChatOptions,
): ChatModel {
  return {
    call: vi.fn(async (prompt: Prompt) => {
      captured.value = prompt;
      return createResponse("response");
    }),
    stream: vi.fn((prompt: Prompt) => {
      captured.value = prompt;
      return of(createResponse("response"));
    }),
    get defaultOptions() {
      return options ?? new DefaultToolCallingChatOptions();
    },
  } as unknown as ChatModel;
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
