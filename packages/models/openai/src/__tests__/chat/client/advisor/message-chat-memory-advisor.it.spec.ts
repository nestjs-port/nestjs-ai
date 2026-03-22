import { ChatClient, MessageChatMemoryAdvisor } from "@nestjs-ai/client-chat";
import {
  ChatMemory,
  InMemoryChatMemoryRepository,
  type Message,
  MessageWindowChatMemory,
  Prompt,
  UserMessage,
} from "@nestjs-ai/model";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { describe, expect, it } from "vitest";
import { OpenAiTestConfiguration } from "../../../open-ai-test-configuration";
import { AbstractChatMemoryAdvisorIT } from "./abstract-chat-memory-advisor.it-shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("MessageChatMemoryAdvisorIT", () => {
  const config = new OpenAiTestConfiguration();
  const createConversationId = (prefix: string) => `${prefix}-${Date.now()}`;
  const abstractIT = new AbstractChatMemoryAdvisorIT({
    chatModel: config.chatModel,
    createAdvisor: (chatMemory) => new MessageChatMemoryAdvisor({ chatMemory }),
  });

  function createChatMemory(): ChatMemory {
    return new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
  }

  it("should handle multiple user messages in same prompt", async () => {
    await abstractIT.testMultipleUserMessagesInSamePrompt();
  });

  it("should use custom conversation id", async () => {
    await abstractIT.testUseCustomConversationId();
  });

  it("should maintain separate conversations", async () => {
    await abstractIT.testMaintainSeparateConversations();
  });

  it("should handle multiple messages in reactive mode", async () => {
    await abstractIT.testHandleMultipleMessagesInReactiveMode();
  });

  it("should handle non-existent conversation", async () => {
    await abstractIT.testHandleNonExistentConversation();
  });

  it("should handle streaming with chat memory", async () => {
    await abstractIT.testStreamingWithChatMemory();
  });

  it.skip("should handle multiple user messages in prompt", async () => {
    // Arrange
    const conversationId = createConversationId("multi-user-messages");
    const chatMemory = createChatMemory();
    // Create MessageChatMemoryAdvisor with the conversation ID.
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId,
    });
    const chatClient = ChatClient.builder(config.chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Create a prompt with multiple user messages.
    const messages: Message[] = [
      new UserMessage({ content: "My name is David." }),
      new UserMessage({ content: "I work as a software engineer." }),
      new UserMessage({ content: "What is my profession?" }),
    ];

    // Create a prompt with the list of messages.
    const prompt = new Prompt(messages);

    // Send the prompt to the chat client.
    const answer = await chatClient
      .prompt(prompt)
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert response is relevant.
    expect((answer ?? "").toLowerCase()).toContain("software engineer");

    // Verify memory contains all user messages.
    const memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(4);
    expect(memoryMessages[0]?.text).toBe("My name is David.");
    expect(memoryMessages[1]?.text).toBe("I work as a software engineer.");
    expect(memoryMessages[2]?.text).toBe("What is my profession?");

    // Send a follow-up question.
    const followUpAnswer = await chatClient
      .prompt()
      .user("What is my name?")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert the model remembers the name.
    expect((followUpAnswer ?? "").toLowerCase()).toContain("david");
  });

  it("should store complete content in streaming mode", async () => {
    // Arrange
    const conversationId = createConversationId("streaming-test");
    const chatMemory = createChatMemory();
    // Create MessageChatMemoryAdvisor with the conversation ID.
    const advisor = new MessageChatMemoryAdvisor({
      chatMemory,
      conversationId,
    });
    const chatClient = ChatClient.builder(config.chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act - Use streaming API.
    const userInput = "Tell me a short joke about programming";

    // Collect the streaming responses.
    const streamedResponses = await firstValueFrom(
      chatClient
        .prompt()
        .user(userInput)
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .stream()
        .content()
        .pipe(toArray()),
    );

    // Assert - Check that the memory contains the complete content.
    expect(streamedResponses.length).toBeGreaterThan(0);

    const memoryMessages = await chatMemory.get(conversationId);

    // Should have at least 2 messages (user + assistant).
    expect(memoryMessages.length).toBeGreaterThanOrEqual(2);

    // First message should be the user message.
    expect(memoryMessages[0]?.text).toBe(userInput);

    // Last message should be the assistant's response and should have content.
    expect(
      (memoryMessages[memoryMessages.length - 1]?.text ?? "").length,
    ).toBeGreaterThan(0);
  });
});
