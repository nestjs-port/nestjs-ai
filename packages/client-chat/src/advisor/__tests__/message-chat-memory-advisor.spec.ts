import type { ChatMemory } from "@nestjs-ai/model";
import {
  AssistantMessage,
  InMemoryChatMemoryRepository,
  MessageWindowChatMemory,
  Prompt,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import type { SchedulerLike } from "rxjs";
import { queueScheduler } from "rxjs";
import { describe, expect, it } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import type { AdvisorChain } from "../api";
import { Advisor } from "../api";
import { MessageChatMemoryAdvisor } from "../message-chat-memory-advisor";

function createChatMemory(): ChatMemory {
  return new MessageWindowChatMemory({
    chatMemoryRepository: new InMemoryChatMemoryRepository(),
  });
}

describe("MessageChatMemoryAdvisor", () => {
  it("when chat memory is null then throw", () => {
    expect(
      () =>
        new MessageChatMemoryAdvisor({
          chatMemory: null as unknown as ChatMemory,
        }),
    ).toThrow("chatMemory cannot be null");
  });

  it("when default conversation id is null then throw", () => {
    expect(
      () =>
        new MessageChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          conversationId: null as unknown as string,
        }),
    ).toThrow("defaultConversationId cannot be null or empty");
  });

  it("when default conversation id is empty then throw", () => {
    expect(
      () =>
        new MessageChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          conversationId: "",
        }),
    ).toThrow("defaultConversationId cannot be null or empty");
  });

  it("when scheduler is null then throw", () => {
    expect(
      () =>
        new MessageChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          scheduler: null as unknown as SchedulerLike,
        }),
    ).toThrow("scheduler cannot be null");
  });

  it("constructor options", () => {
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory: createChatMemory(),
      conversationId: "test-conversation-id",
      order: 42,
      scheduler: queueScheduler,
    });

    expect(advisor).toBeDefined();
    expect(advisor.order).toBe(42);
  });

  it("default values", () => {
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory: createChatMemory(),
    });

    expect(advisor).toBeDefined();
    expect(advisor.order).toBe(Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER);
  });

  it("before method handles tool response message", async () => {
    const chatMemory = createChatMemory();
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const toolResponse = new ToolResponseMessage({
      responses: [
        {
          id: "weather-tool-1",
          name: "getWeather",
          responseData: "Sunny, 72F",
        },
      ],
    });

    const prompt = Prompt.builder()
      .messages(
        new UserMessage({ content: "What's the weather?" }),
        new AssistantMessage({ content: "Let me check..." }),
        toolResponse,
      )
      .build();

    const request = ChatClientRequest.builder().prompt(prompt).build();

    await advisor.before(request, {} as AdvisorChain);

    const messages = chatMemory.get("test-conversation");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(ToolResponseMessage);
  });

  it("before method handles user message when no tool response", async () => {
    const chatMemory = createChatMemory();
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "Hello" }))
      .build();

    const request = ChatClientRequest.builder().prompt(prompt).build();

    await advisor.before(request, {} as AdvisorChain);

    const messages = chatMemory.get("test-conversation");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(UserMessage);
    expect(messages[0]?.text).toBe("Hello");
  });

  it("before method handles tool response after user message", async () => {
    const chatMemory = createChatMemory();
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt1 = Prompt.builder()
      .messages(new UserMessage({ content: "What's the weather?" }))
      .build();
    const request1 = ChatClientRequest.builder().prompt(prompt1).build();

    await advisor.before(request1, {} as AdvisorChain);

    const toolResponse = new ToolResponseMessage({
      responses: [
        {
          id: "weather-tool-2",
          name: "getWeather",
          responseData: "Sunny, 72F",
        },
      ],
    });
    const prompt2 = Prompt.builder()
      .messages(
        new UserMessage({ content: "What's the weather?" }),
        new AssistantMessage({ content: "Let me check..." }),
        toolResponse,
      )
      .build();
    const request2 = ChatClientRequest.builder().prompt(prompt2).build();

    await advisor.before(request2, {} as AdvisorChain);

    const messages = chatMemory.get("test-conversation");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(UserMessage);
    expect(messages[1]).toBeInstanceOf(ToolResponseMessage);
  });

  it("before method moves system message to first position", async () => {
    const chatMemory = createChatMemory();
    chatMemory.add("test-conversation", [
      new UserMessage({ content: "Previous question" }),
      new AssistantMessage({ content: "Previous answer" }),
    ]);

    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt = Prompt.builder()
      .messages(
        new UserMessage({ content: "Hello" }),
        new SystemMessage({ content: "You are a helpful assistant" }),
      )
      .build();

    const request = ChatClientRequest.builder().prompt(prompt).build();
    const processedRequest = await advisor.before(request, {} as AdvisorChain);

    const processedMessages = processedRequest.prompt.instructions;
    expect(processedMessages.length).toBeGreaterThan(0);
    expect(processedMessages[0]).toBeInstanceOf(SystemMessage);
    expect(processedMessages[0]?.text).toBe("You are a helpful assistant");
  });

  it("before method keeps system message first when already first", async () => {
    const chatMemory = createChatMemory();
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt = Prompt.builder()
      .messages(
        new SystemMessage({ content: "You are a helpful assistant" }),
        new UserMessage({ content: "Hello" }),
      )
      .build();

    const request = ChatClientRequest.builder().prompt(prompt).build();
    const processedRequest = await advisor.before(request, {} as AdvisorChain);

    const processedMessages = processedRequest.prompt.instructions;
    expect(processedMessages.length).toBeGreaterThan(0);
    expect(processedMessages[0]).toBeInstanceOf(SystemMessage);
    expect(processedMessages[0]?.text).toBe("You are a helpful assistant");
    expect(processedMessages[1]).toBeInstanceOf(UserMessage);
  });
});
