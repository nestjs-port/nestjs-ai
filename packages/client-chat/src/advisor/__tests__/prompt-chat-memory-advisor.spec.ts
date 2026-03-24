import type { ChatMemory } from "@nestjs-ai/model";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  InMemoryChatMemoryRepository,
  MessageWindowChatMemory,
  Prompt,
  PromptTemplate,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import type { SchedulerLike } from "rxjs";
import { queueScheduler } from "rxjs";
import { describe, expect, it } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import type { AdvisorChain } from "../api";
import { Advisor } from "../api";
import { PromptChatMemoryAdvisor } from "../prompt-chat-memory-advisor";

function createChatMemory(): ChatMemory {
  return new MessageWindowChatMemory({
    chatMemoryRepository: new InMemoryChatMemoryRepository(),
  });
}

describe("PromptChatMemoryAdvisor", () => {
  it("when chat memory is null then throw", () => {
    expect(
      () =>
        new PromptChatMemoryAdvisor({
          chatMemory: null as unknown as ChatMemory,
        }),
    ).toThrow("chatMemory cannot be null");
  });

  it("when default conversation id is null then throw", () => {
    expect(
      () =>
        new PromptChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          conversationId: null as unknown as string,
        }),
    ).toThrow("defaultConversationId cannot be null or empty");
  });

  it("when default conversation id is empty then throw", () => {
    expect(
      () =>
        new PromptChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          conversationId: null as unknown as string,
        }),
    ).toThrow("defaultConversationId cannot be null or empty");
  });

  it("when scheduler is null then throw", () => {
    expect(
      () =>
        new PromptChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          scheduler: null as unknown as SchedulerLike,
        }),
    ).toThrow("scheduler cannot be null");
  });

  it("when system prompt template is null then throw", () => {
    expect(
      () =>
        new PromptChatMemoryAdvisor({
          chatMemory: createChatMemory(),
          systemPromptTemplate: null as unknown as PromptTemplate,
        }),
    ).toThrow("systemPromptTemplate cannot be null");
  });

  it("test builder method chaining", () => {
    // Create a chat memory
    // Test constructor options chaining equivalent to Java builder chaining
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory: createChatMemory(),
      conversationId: "test-conversation-id",
      order: 42,
      scheduler: queueScheduler,
    });

    // Verify the advisor was built with the correct properties
    expect(advisor).toBeDefined();
    expect(advisor.order).toBe(42);
  });

  it("test system prompt template chaining", () => {
    // Create a chat memory
    // Test chaining with systemPromptTemplate option
    const customTemplate = new PromptTemplate(
      "Custom template with {instructions} and {memory}",
    );

    const advisor = new PromptChatMemoryAdvisor({
      chatMemory: createChatMemory(),
      conversationId: "custom-id",
      systemPromptTemplate: customTemplate,
      order: 100,
    });

    expect(advisor).toBeDefined();
    expect(advisor.order).toBe(100);
  });

  it("test default values", () => {
    // Create advisor with default values
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory: createChatMemory(),
    });

    // Verify default values
    expect(advisor).toBeDefined();
    expect(advisor.order).toBe(Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER);
  });

  it("test after method handles single generation", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Single response",
          }),
        }),
      ],
    });
    const response = ChatClientResponse.builder()
      .chatResponse(chatResponse)
      .build();

    const result = await advisor.after(response, {} as AdvisorChain);

    // Should return the same response
    expect(result).toBe(response);
    // Verify single message stored in memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe("Single response");
  });

  it("test after method handles multiple generations", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({ content: "Response 1" }),
        }),
        new Generation({
          assistantMessage: new AssistantMessage({ content: "Response 2" }),
        }),
        new Generation({
          assistantMessage: new AssistantMessage({ content: "Response 3" }),
        }),
      ],
    });
    const response = ChatClientResponse.builder()
      .chatResponse(chatResponse)
      .build();

    const result = await advisor.after(response, {} as AdvisorChain);

    // Should return the same response
    expect(result).toBe(response);
    // Verify all messages were stored in memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toBe("Response 1");
    expect(messages[1]?.text).toBe("Response 2");
    expect(messages[2]?.text).toBe("Response 3");
  });

  it("test after method handles empty results", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const chatResponse = new ChatResponse({ generations: [] });
    const response = ChatClientResponse.builder()
      .chatResponse(chatResponse)
      .build();

    const result = await advisor.after(response, {} as AdvisorChain);

    expect(result).toBe(response);
    // Verify no messages were stored in memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(0);
  });

  it("test after method handles null chat response", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const response = ChatClientResponse.builder().chatResponse(null).build();

    const result = await advisor.after(response, {} as AdvisorChain);

    expect(result).toBe(response);
    // Verify no messages were stored in memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(0);
  });

  it("before method handles tool response message", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    // Create a prompt with a ToolResponseMessage as the last message
    const toolResponse = new ToolResponseMessage({
      responses: [
        {
          id: "weatherTool",
          name: "getWeather",
          responseData: "Sunny, 72°F",
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

    // Verify that the ToolResponseMessage was added to memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(ToolResponseMessage);
  });

  it("before method handles user message when no tool response", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "Hello" }))
      .build();
    const request = ChatClientRequest.builder().prompt(prompt).build();

    await advisor.before(request, {} as AdvisorChain);

    // Verify that the UserMessage was added to memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(UserMessage);
    expect(messages[0]?.text).toBe("Hello");
  });

  it("before method handles tool response after user message", async () => {
    const chatMemory = createChatMemory();
    const advisor = new PromptChatMemoryAdvisor({
      chatMemory,
      conversationId: "test-conversation",
    });

    const prompt1 = Prompt.builder()
      .messages(new UserMessage({ content: "What's the weather?" }))
      .build();
    const request1 = ChatClientRequest.builder().prompt(prompt1).build();

    await advisor.before(request1, {} as AdvisorChain);

    // Second request with tool response as the last message
    const toolResponse = new ToolResponseMessage({
      responses: [
        {
          id: "weatherTool",
          name: "getWeather",
          responseData: "Sunny, 72°F",
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

    // Verify that both messages were added to memory
    const messages = await chatMemory.get("test-conversation");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(UserMessage);
    expect(messages[1]).toBeInstanceOf(ToolResponseMessage);
  });
});
