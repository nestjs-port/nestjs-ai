import type { Advisor } from "@nestjs-ai/client-chat";
import { ChatClient } from "@nestjs-ai/client-chat";
import {
  ChatMemory,
  type ChatModel,
  InMemoryChatMemoryRepository,
  type Message,
  MessageWindowChatMemory,
  Prompt,
  UserMessage,
} from "@nestjs-ai/model";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { expect } from "vitest";

/**
 * Abstract base suite for chat memory advisor integration tests.
 * Contains common test logic to avoid duplication between advisor implementations.
 */
export interface AbstractChatMemoryAdvisorITProps {
  chatModel: ChatModel;
  /**
   * Create an advisor instance for testing.
   * @param chatMemory The chat memory to use.
   * @returns An advisor instance to test.
   */
  createAdvisor: (chatMemory: ChatMemory) => Advisor;
  /**
   * Assert the follow-up response meets expectations for the advisor type.
   * Default behavior expects the model to remember "John".
   */
  assertFollowUpResponse?: (followUpAnswer: string) => void;
  /**
   * Assert the follow-up response for a specific name.
   */
  assertFollowUpResponseForName?: (
    followUpAnswer: string,
    expectedName: string,
  ) => void;
  /**
   * Assert the response for a non-existent conversation.
   */
  assertNonExistentConversationResponse?: (answer: string) => void;
  /**
   * Assert the follow-up response for reactive mode tests.
   */
  assertReactiveFollowUpResponse?: (followUpAnswer: string) => void;
}

function containsIgnoringCase(content: string, expected: string): boolean {
  return content.toLowerCase().includes(expected.toLowerCase());
}

function createConversationId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function createChatMemory(): ChatMemory {
  return new MessageWindowChatMemory({
    chatMemoryRepository: new InMemoryChatMemoryRepository(),
  });
}

async function collectStreamContent(
  chatClient: ChatClient,
  userText: string,
  conversationId: string,
): Promise<string> {
  const chunks = await firstValueFrom(
    chatClient
      .prompt()
      .user(userText)
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .stream()
      .content()
      .pipe(toArray()),
  );
  return chunks[chunks.length - 1] ?? "";
}

export class AbstractChatMemoryAdvisorIT {
  private readonly _chatModel: ChatModel;
  private readonly _createAdvisor: (chatMemory: ChatMemory) => Advisor;
  private readonly _assertFollowUpResponse: (followUpAnswer: string) => void;
  private readonly _assertFollowUpResponseForName: (
    followUpAnswer: string,
    expectedName: string,
  ) => void;
  private readonly _assertNonExistentConversationResponse: (
    answer: string,
  ) => void;
  private readonly _assertReactiveFollowUpResponse: (
    followUpAnswer: string,
  ) => void;

  constructor({
    chatModel,
    createAdvisor,
    assertFollowUpResponse = (followUpAnswer) => {
      expect(containsIgnoringCase(followUpAnswer, "John")).toBe(true);
    },
    assertFollowUpResponseForName = (followUpAnswer, expectedName) => {
      expect(containsIgnoringCase(followUpAnswer, expectedName)).toBe(true);
    },
    assertNonExistentConversationResponse = (answer) => {
      const normalized = answer.toLowerCase().replaceAll("’", "'");
      const containsExpectedWord =
        normalized.includes("don't") ||
        normalized.includes("no") ||
        normalized.includes("not") ||
        normalized.includes("previous") ||
        normalized.includes("past conversation") ||
        normalized.includes("independent") ||
        normalized.includes("retain information");
      expect(containsExpectedWord).toBe(true);
    },
    assertReactiveFollowUpResponse = (followUpAnswer) => {
      expect(containsIgnoringCase(followUpAnswer, "Charlie")).toBe(true);
      expect(containsIgnoringCase(followUpAnswer, "London")).toBe(true);
    },
  }: AbstractChatMemoryAdvisorITProps) {
    this._chatModel = chatModel;
    this._createAdvisor = createAdvisor;
    this._assertFollowUpResponse = assertFollowUpResponse;
    this._assertFollowUpResponseForName = assertFollowUpResponseForName;
    this._assertNonExistentConversationResponse =
      assertNonExistentConversationResponse;
    this._assertReactiveFollowUpResponse = assertReactiveFollowUpResponse;
  }

  /**
   * Common test logic for handling multiple user messages in the same prompt.
   */
  async testMultipleUserMessagesInSamePrompt(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("test-conversation-multi-user");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act - Create a list of messages for the prompt.
    const messages: Message[] = [
      new UserMessage({ content: "My name is John." }),
      new UserMessage({ content: "I am from New York." }),
      new UserMessage({ content: "What city am I from?" }),
    ];

    // Send the prompt to the chat client.
    const answer = await chatClient
      .prompt(new Prompt(messages))
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert response is relevant to the last question.
    expect(answer).not.toBeNull();
    expect(containsIgnoringCase(answer ?? "", "New York")).toBe(true);

    // Verify memory contains all user messages and the response.
    let memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(4);
    expect(memoryMessages[0]?.text).toBe("My name is John.");
    expect(memoryMessages[1]?.text).toBe("I am from New York.");
    expect(memoryMessages[2]?.text).toBe("What city am I from?");

    // Act - Send a follow-up question.
    const followUpAnswer = await chatClient
      .prompt()
      .user("What is my name?")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Use the subclass-specific assertion for the follow-up response.
    this._assertFollowUpResponse(followUpAnswer ?? "");

    // Verify memory now contains all previous messages plus the follow-up and its response.
    memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(6);
    expect(memoryMessages[4]?.text).toBe("What is my name?");
  }

  /**
   * Common test logic for handling multiple user messages in the same prompt.
   */
  async testMultipleUserMessagesInPrompt(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("multi-user-messages");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Create a prompt with multiple user messages.
    const messages: Message[] = [
      new UserMessage({ content: "My name is David." }),
      new UserMessage({ content: "I work as a software engineer." }),
      new UserMessage({ content: "What is my profession?" }),
    ];

    // Send the prompt to the chat client.
    const answer = await chatClient
      .prompt(new Prompt(messages))
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert response is relevant.
    expect(answer).not.toBeNull();
    expect(containsIgnoringCase(answer ?? "", "software engineer")).toBe(true);

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
    expect(containsIgnoringCase(followUpAnswer ?? "", "David")).toBe(true);
  }

  /**
   * Tests that the advisor correctly uses a custom conversation ID when provided.
   */
  async testUseCustomConversationId(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("custom-conversation-id");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    const question = "What is the capital of Germany?";

    // Act
    const answer = await chatClient
      .prompt()
      .user(question)
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert response is relevant.
    expect(answer).not.toBeNull();
    expect(containsIgnoringCase(answer ?? "", "Berlin")).toBe(true);

    // Verify memory contains the question and answer.
    const memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(2);
    expect(memoryMessages[0]?.text).toBe(question);
  }

  /**
   * Tests that the advisor maintains separate conversations for different conversation IDs.
   */
  async testMaintainSeparateConversations(): Promise<void> {
    // Arrange
    const conversationId1 = createConversationId("conversation-1");
    const conversationId2 = createConversationId("conversation-2");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act - First conversation.
    await chatClient
      .prompt()
      .user("My name is Alice.")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId1),
      )
      .call()
      .content();

    // Act - Second conversation.
    await chatClient
      .prompt()
      .user("My name is Bob.")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId2),
      )
      .call()
      .content();

    // Verify memory contains separate conversations.
    let memoryMessages1 = await chatMemory.get(conversationId1);
    let memoryMessages2 = await chatMemory.get(conversationId2);
    expect(memoryMessages1).toHaveLength(2);
    expect(memoryMessages2).toHaveLength(2);
    expect(memoryMessages1[0]?.text).toBe("My name is Alice.");
    expect(memoryMessages2[0]?.text).toBe("My name is Bob.");

    // Act - Follow-up in first conversation.
    const followUpAnswer1 = await chatClient
      .prompt()
      .user("What is my name?")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId1),
      )
      .call()
      .content();

    // Act - Follow-up in second conversation.
    const followUpAnswer2 = await chatClient
      .prompt()
      .user("What is my name?")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId2),
      )
      .call()
      .content();

    // Assert responses are relevant to their respective conversations.
    this._assertFollowUpResponseForName(followUpAnswer1 ?? "", "Alice");
    this._assertFollowUpResponseForName(followUpAnswer2 ?? "", "Bob");

    // Verify memory now contains all messages for both conversations.
    memoryMessages1 = await chatMemory.get(conversationId1);
    memoryMessages2 = await chatMemory.get(conversationId2);
    expect(memoryMessages1).toHaveLength(4);
    expect(memoryMessages2).toHaveLength(4);
    expect(memoryMessages1[2]?.text).toBe("What is my name?");
    expect(memoryMessages2[2]?.text).toBe("What is my name?");
  }

  /**
   * Tests handling multiple messages in reactive mode.
   */
  async testHandleMultipleMessagesInReactiveMode(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("reactive-conversation");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act
    for (const message of [
      "My name is Charlie.",
      "I am 30 years old.",
      "I live in London.",
    ]) {
      await chatClient
        .prompt()
        .user(message)
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();
    }

    // Assert
    let memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(6);
    expect(memoryMessages[0]?.text).toBe("My name is Charlie.");
    expect(memoryMessages[2]?.text).toBe("I am 30 years old.");
    expect(memoryMessages[4]?.text).toBe("I live in London.");

    // Act - Follow-up
    const followUpAnswer = await chatClient
      .prompt()
      .user("What is my name and where do I live?")
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert
    this._assertReactiveFollowUpResponse(followUpAnswer ?? "");
    memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(8);
    expect(memoryMessages[6]?.text).toBe(
      "What is my name and where do I live?",
    );
  }

  /**
   * Tests that the advisor handles a non-existent conversation ID gracefully.
   */
  async testHandleNonExistentConversation(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("non-existent-conversation");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act - Send a question to a non-existent conversation.
    const question = "Do you remember our previous conversation?";
    const answer = await chatClient
      .prompt()
      .user(question)
      .advisors((advisorSpec) =>
        advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
      )
      .call()
      .content();

    // Assert response indicates no previous conversation.
    expect(answer).not.toBeNull();
    this._assertNonExistentConversationResponse(answer ?? "");

    // Verify memory now contains this message.
    const memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(2);
    expect(memoryMessages[0]?.text).toBe(question);
  }

  /**
   * Tests that the advisor correctly handles streaming responses and updates memory.
   */
  async testStreamingWithChatMemory(): Promise<void> {
    // Arrange
    const conversationId = createConversationId("streaming-conversation");
    const chatMemory = createChatMemory();
    const advisor = this._createAdvisor(chatMemory);
    const chatClient = ChatClient.builder(this._chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act - Send a message using streaming.
    const initialQuestion = "My name is David and I live in Seattle.";
    // Collect all streaming chunks.
    const completeResponse = await collectStreamContent(
      chatClient,
      initialQuestion,
      conversationId,
    );
    expect(completeResponse.length).toBeGreaterThan(0);

    // Verify memory contains the initial question and the response.
    let memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(2);
    expect(memoryMessages[0]?.text).toBe(initialQuestion);

    // Send a follow-up question using streaming.
    const followUpQuestion = "Where do I live?";
    const followUpResponse = await collectStreamContent(
      chatClient,
      followUpQuestion,
      conversationId,
    );

    // Verify the follow-up response contains the location.
    expect(containsIgnoringCase(followUpResponse, "Seattle")).toBe(true);

    // Verify memory now contains all messages.
    memoryMessages = await chatMemory.get(conversationId);
    expect(memoryMessages).toHaveLength(4);
    expect(memoryMessages[0]?.text).toBe(initialQuestion);
    expect(memoryMessages[2]?.text).toBe(followUpQuestion);
  }
}
