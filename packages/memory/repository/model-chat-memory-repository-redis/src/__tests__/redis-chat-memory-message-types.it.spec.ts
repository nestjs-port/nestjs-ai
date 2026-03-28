import { randomUUID } from "node:crypto";
import {
  AssistantMessage,
  type Message,
  MessageType,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryConfig } from "../redis-chat-memory-config";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Helper method to parse metadata from string in format
// "key1=value1;key2=value2;key3=value3"
function parseMetadata(metadataString: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  const pairs = metadataString.split(";");

  for (const pair of pairs) {
    const keyValue = pair.split("=");
    if (keyValue.length === 2 && keyValue[0] && keyValue[1]) {
      metadata[keyValue[0]] = keyValue[1];
    }
  }

  return metadata;
}

describe("RedisChatMemoryMessageTypesIT", () => {
  let redisContainer: StartedRedisContainer;
  let client: RedisClientType;
  let chatMemory: RedisChatMemoryRepository;

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();

    client = createClient({ url: redisUrl }) as RedisClientType;
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(`test-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .build();

    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }
  });

  afterAll(async () => {
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  it("should handle all message types", async () => {
    const conversationId = "test-conversation";

    // Create messages of different types with various content
    const systemMessage = new SystemMessage({
      content: "You are a helpful assistant",
    });
    const userMessage = new UserMessage({
      content: "What's the capital of France?",
    });
    const assistantMessage = new AssistantMessage({
      content: "The capital of France is Paris.",
    });

    // Store each message type
    await chatMemory.add(conversationId, systemMessage);
    await chatMemory.add(conversationId, userMessage);
    await chatMemory.add(conversationId, assistantMessage);

    // Retrieve and verify messages
    const messages = await chatMemory.get(conversationId, 10);

    // Verify correct number of messages
    expect(messages).toHaveLength(3);

    // Verify message order and content
    expect(messages[0]?.text).toBe("You are a helpful assistant");
    expect(messages[1]?.text).toBe("What's the capital of France?");
    expect(messages[2]?.text).toBe("The capital of France is Paris.");

    // Verify message types
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    expect(messages[1]).toBeInstanceOf(UserMessage);
    expect(messages[2]).toBeInstanceOf(AssistantMessage);
  });

  it.each([
    ["Message from assistant", MessageType.ASSISTANT],
    ["Message from user", MessageType.USER],
    ["Message from system", MessageType.SYSTEM],
  ])("should store and retrieve single message (%s, %s)", async (content, messageType) => {
    const conversationId = randomUUID();

    // Create a message of the specified type
    const message =
      messageType === MessageType.ASSISTANT
        ? new AssistantMessage({ content: `${content} - ${conversationId}` })
        : messageType === MessageType.USER
          ? new UserMessage({ content: `${content} - ${conversationId}` })
          : messageType === MessageType.SYSTEM
            ? new SystemMessage({ content: `${content} - ${conversationId}` })
            : (() => {
                throw new TypeError(
                  `Type not supported: ${messageType.toString()}`,
                );
              })();

    // Store the message
    await chatMemory.add(conversationId, message);

    // Retrieve messages
    const messages = await chatMemory.get(conversationId, 10);

    // Verify message was stored and retrieved correctly
    expect(messages).toHaveLength(1);
    const retrievedMessage = messages[0];
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }

    // Verify the message type
    expect(retrievedMessage.messageType).toBe(messageType);

    // Verify the content
    expect(retrievedMessage.text).toBe(`${content} - ${conversationId}`);

    // Verify the correct class type
    if (messageType === MessageType.ASSISTANT) {
      expect(retrievedMessage).toBeInstanceOf(AssistantMessage);
    } else if (messageType === MessageType.USER) {
      expect(retrievedMessage).toBeInstanceOf(UserMessage);
    } else if (messageType === MessageType.SYSTEM) {
      expect(retrievedMessage).toBeInstanceOf(SystemMessage);
    } else {
      throw new TypeError(`Type not supported: ${messageType.toString()}`);
    }
  });

  it("should handle system message with metadata", async () => {
    const conversationId = "test-conversation-system";

    // Create a System message with metadata using builder
    const systemMessage = new SystemMessage({
      content: "You are a specialized AI assistant for legal questions",
      properties: { domain: "legal", version: "2.0", restricted: "true" },
    });

    // Store the message
    await chatMemory.add(conversationId, systemMessage);

    // Retrieve messages
    const messages = await chatMemory.get(conversationId, 10);

    // Verify message count
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    const retrievedMessage = messages[0] as SystemMessage | undefined;
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }

    // Verify content
    expect(retrievedMessage.text).toBe(
      "You are a specialized AI assistant for legal questions",
    );

    // Verify metadata is preserved
    expect(retrievedMessage.metadata).toHaveProperty("domain", "legal");
    expect(retrievedMessage.metadata).toHaveProperty("version", "2.0");
    expect(retrievedMessage.metadata).toHaveProperty("restricted", "true");
  });

  it("should handle multiple system messages", async () => {
    const conversationId = "multi-system-test";

    // Create multiple system messages with different content
    const systemMessage1 = new SystemMessage({
      content: "You are a helpful assistant",
    });
    const systemMessage2 = new SystemMessage({
      content: "Always provide concise answers",
    });
    const systemMessage3 = new SystemMessage({
      content: "Do not share personal information",
    });

    // Create a batch of system messages
    const systemMessages: Message[] = [
      systemMessage1,
      systemMessage2,
      systemMessage3,
    ];

    // Store all messages at once
    await chatMemory.add(conversationId, systemMessages);

    // Retrieve messages
    const retrievedMessages = await chatMemory.get(conversationId, 10);

    // Verify all messages were stored and retrieved
    expect(retrievedMessages).toHaveLength(3);
    for (const message of retrievedMessages) {
      expect(message).toBeInstanceOf(SystemMessage);
    }

    // Verify content
    expect(retrievedMessages[0]?.text).toBe(systemMessage1.text);
    expect(retrievedMessages[1]?.text).toBe(systemMessage2.text);
    expect(retrievedMessages[2]?.text).toBe(systemMessage3.text);
  });

  it("should handle message with metadata", async () => {
    const conversationId = "test-conversation";

    // Create messages with metadata using builder
    const userMessage = new UserMessage({
      content: "Hello with metadata",
      properties: { source: "web", user_id: "12345" },
    });

    const assistantMessage = new AssistantMessage({
      content: "Hi there!",
      properties: { model: "gpt-4", temperature: "0.7" },
    });

    // Store messages with metadata
    await chatMemory.add(conversationId, userMessage);
    await chatMemory.add(conversationId, assistantMessage);

    // Retrieve messages
    const messages = await chatMemory.get(conversationId, 10);

    // Verify message count
    expect(messages).toHaveLength(2);

    // Verify metadata is preserved
    expect(messages[0]?.metadata).toHaveProperty("source", "web");
    expect(messages[0]?.metadata).toHaveProperty("user_id", "12345");
    expect(messages[1]?.metadata).toHaveProperty("model", "gpt-4");
    expect(messages[1]?.metadata).toHaveProperty("temperature", "0.7");
  });

  it.each([
    [MessageType.ASSISTANT, "model=gpt-4;temperature=0.7;api_version=1.0"],
    [MessageType.USER, "source=web;user_id=12345;client=mobile"],
    [MessageType.SYSTEM, "domain=legal;version=2.0;restricted=true"],
  ])("should store and retrieve message with metadata (%s)", async (messageType, metadataString) => {
    const conversationId = randomUUID();
    const content = `Message with metadata - ${messageType.toString()}`;

    // Parse metadata from string
    const metadata = parseMetadata(metadataString);

    // Create a message with metadata
    const message =
      messageType === MessageType.ASSISTANT
        ? new AssistantMessage({ content, properties: metadata })
        : messageType === MessageType.USER
          ? new UserMessage({ content, properties: metadata })
          : messageType === MessageType.SYSTEM
            ? new SystemMessage({ content, properties: metadata })
            : (() => {
                throw new TypeError(
                  `Type not supported: ${messageType.toString()}`,
                );
              })();

    // Store the message
    await chatMemory.add(conversationId, message);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify message was stored correctly
    expect(messages).toHaveLength(1);
    const retrievedMessage = messages[0];
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }

    // Verify message type
    expect(retrievedMessage.messageType).toBe(messageType);

    // Verify all metadata entries are present
    for (const [key, value] of Object.entries(metadata)) {
      expect(retrievedMessage.metadata).toHaveProperty(key, value);
    }
  });

  it("should handle assistant message with tool calls", async () => {
    const conversationId = "test-conversation";

    // Create an AssistantMessage with tool calls
    const toolCalls = [
      {
        id: "tool-1",
        type: "function",
        name: "weather",
        arguments: '{"location": "Paris"}',
      },
      {
        id: "tool-2",
        type: "function",
        name: "calculator",
        arguments: '{"operation": "add", "args": [1, 2]}',
      },
    ];

    const assistantMessage = new AssistantMessage({
      content: "I'll check that for you.",
      properties: { model: "gpt-4" },
      toolCalls,
      media: [],
    });

    // Store message with tool calls
    await chatMemory.add(conversationId, assistantMessage);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify we get back the same type of message
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(AssistantMessage);
    const retrievedMessage = messages[0] as AssistantMessage | undefined;
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }

    // Cast and verify tool calls
    expect(retrievedMessage.toolCalls).toHaveLength(2);

    // Verify tool call content
    const firstToolCall = retrievedMessage.toolCalls[0];
    expect(firstToolCall?.name).toBe("weather");
    expect(firstToolCall?.arguments).toBe('{"location": "Paris"}');

    const secondToolCall = retrievedMessage.toolCalls[1];
    expect(secondToolCall?.name).toBe("calculator");
    expect(secondToolCall?.arguments).toContain('"operation": "add"');
  });

  it("should handle basic tool response message", async () => {
    const conversationId = "tool-response-conversation";

    // Create a simple ToolResponseMessage with a single tool response
    const weatherResponse = {
      id: "tool-1",
      name: "weather",
      responseData:
        '{"location":"Paris","temperature":"22°C","conditions":"Partly Cloudy"}',
    };

    // Create the message with a single tool response
    const toolResponseMessage = new ToolResponseMessage({
      responses: [weatherResponse],
    });

    // Store the message
    await chatMemory.add(conversationId, toolResponseMessage);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify we get back the correct message
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(ToolResponseMessage);
    expect(messages[0]?.messageType).toBe(MessageType.TOOL);

    // Cast and verify tool responses
    const retrievedMessage = messages[0] as ToolResponseMessage | undefined;
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }
    const toolResponses = retrievedMessage.responses;

    // Verify tool response content
    expect(toolResponses).toHaveLength(1);
    const response = toolResponses[0];
    expect(response?.id).toBe("tool-1");
    expect(response?.name).toBe("weather");
    expect(response?.responseData).toContain("Paris");
    expect(response?.responseData).toContain("22°C");
  });

  it("should handle tool response message with multiple responses", async () => {
    const conversationId = "multi-tool-response-conversation";

    // Create multiple tool responses
    const weatherResponse = {
      id: "tool-1",
      name: "weather",
      responseData:
        '{"location":"Paris","temperature":"22°C","conditions":"Partly Cloudy"}',
    };

    const calculatorResponse = {
      id: "tool-2",
      name: "calculator",
      responseData: '{"operation":"add","args":[1,2],"result":3}',
    };

    const databaseResponse = {
      id: "tool-3",
      name: "database",
      responseData: '{"query":"SELECT * FROM users","count":42}',
    };

    // Create the message with multiple tool responses and metadata
    const toolResponseMessage = new ToolResponseMessage({
      responses: [weatherResponse, calculatorResponse, databaseResponse],
      properties: { source: "tools-api", version: "1.0" },
    });

    // Store the message
    await chatMemory.add(conversationId, toolResponseMessage);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify message type and count
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(ToolResponseMessage);
    const retrievedMessage = messages[0] as ToolResponseMessage | undefined;
    expect(retrievedMessage).toBeDefined();
    if (!retrievedMessage) {
      return;
    }

    // Cast and verify
    expect(retrievedMessage).toBeInstanceOf(ToolResponseMessage);

    // Verify metadata
    expect(retrievedMessage.metadata).toHaveProperty("source", "tools-api");
    expect(retrievedMessage.metadata).toHaveProperty("version", "1.0");

    // Verify tool responses
    const toolResponses = retrievedMessage.responses;
    expect(toolResponses).toHaveLength(3);

    // Verify first response (weather)
    const response1 = toolResponses[0];
    expect(response1?.id).toBe("tool-1");
    expect(response1?.name).toBe("weather");
    expect(response1?.responseData).toContain("Paris");

    // Verify second response (calculator)
    const response2 = toolResponses[1];
    expect(response2?.id).toBe("tool-2");
    expect(response2?.name).toBe("calculator");
    expect(response2?.responseData).toContain("result");

    // Verify third response (database)
    const response3 = toolResponses[2];
    expect(response3?.id).toBe("tool-3");
    expect(response3?.name).toBe("database");
    expect(response3?.responseData).toContain("count");
  });

  it("should handle tool response in conversation flow", async () => {
    const conversationId = "tool-conversation-flow";

    // Create a typical conversation flow with tool responses
    const userMessage = new UserMessage({
      content: "What's the weather in Paris?",
    });

    // Assistant requests weather information via tool
    const toolCalls = [
      {
        id: "weather-req-1",
        type: "function",
        name: "weather",
        arguments: '{"location":"Paris"}',
      },
    ];
    const assistantMessage = new AssistantMessage({
      content: "I'll check the weather for you.",
      properties: {},
      toolCalls,
      media: [],
    });

    // Tool provides weather information
    const weatherResponse = {
      id: "weather-req-1",
      name: "weather",
      responseData:
        '{"location":"Paris","temperature":"22°C","conditions":"Partly Cloudy"}',
    };
    const toolResponseMessage = new ToolResponseMessage({
      responses: [weatherResponse],
    });

    // Assistant summarizes the information
    const finalResponse = new AssistantMessage({
      content: "The current weather in Paris is 22°C and partly cloudy.",
    });

    // Store the conversation
    const conversation: Message[] = [
      userMessage,
      assistantMessage,
      toolResponseMessage,
      finalResponse,
    ];
    await chatMemory.add(conversationId, conversation);

    // Retrieve the conversation
    const messages = await chatMemory.get(conversationId, 10);

    // Verify the conversation flow
    expect(messages).toHaveLength(4);
    expect(messages[0]).toBeInstanceOf(UserMessage);
    expect(messages[1]).toBeInstanceOf(AssistantMessage);
    expect(messages[2]).toBeInstanceOf(ToolResponseMessage);
    expect(messages[3]).toBeInstanceOf(AssistantMessage);

    // Verify the tool response
    const retrievedToolResponse = messages[2] as
      | ToolResponseMessage
      | undefined;
    expect(retrievedToolResponse).toBeDefined();
    if (!retrievedToolResponse) {
      return;
    }
    expect(retrievedToolResponse.responses).toHaveLength(1);
    expect(retrievedToolResponse.responses[0]?.name).toBe("weather");
    expect(retrievedToolResponse.responses[0]?.responseData).toContain("Paris");

    // Verify the final response includes information from the tool
    const retrievedFinalResponse = messages[3] as AssistantMessage | undefined;
    expect(retrievedFinalResponse).toBeDefined();
    if (!retrievedFinalResponse) {
      return;
    }
    expect(retrievedFinalResponse.text ?? "").toContain("22°C");
    expect(retrievedFinalResponse.text ?? "").toContain("partly cloudy");
  });

  it("get messages with all message types should preserve message order", async () => {
    const conversationId = "complex-order-test";

    // Create a complex conversation with all message types in a specific order
    const systemMessage = new SystemMessage({
      content: "You are a helpful AI assistant.",
    });
    const userMessage1 = new UserMessage({
      content: "What's the capital of France?",
    });
    const assistantMessage1 = new AssistantMessage({
      content: "The capital of France is Paris.",
    });
    const userMessage2 = new UserMessage({
      content: "What's the weather there?",
    });

    // Assistant using tool to check weather
    const toolCalls = [
      {
        id: "weather-tool-1",
        type: "function",
        name: "weather",
        arguments: '{"location":"Paris"}',
      },
    ];
    const assistantToolCall = new AssistantMessage({
      content: "I'll check the weather in Paris for you.",
      properties: {},
      toolCalls,
      media: [],
    });

    // Tool response
    const weatherResponse = {
      id: "weather-tool-1",
      name: "weather",
      responseData:
        '{"location":"Paris","temperature":"24°C","conditions":"Sunny"}',
    };
    const toolResponseMessage = new ToolResponseMessage({
      responses: [weatherResponse],
    });

    // Final assistant response using the tool information
    const assistantFinal = new AssistantMessage({
      content: "The weather in Paris is currently 24°C and sunny.",
    });

    // Create ordered list of messages
    const expectedMessages: Message[] = [
      systemMessage,
      userMessage1,
      assistantMessage1,
      userMessage2,
      assistantToolCall,
      toolResponseMessage,
      assistantFinal,
    ];

    // Add each message individually with small delays
    for (const message of expectedMessages) {
      await chatMemory.add(conversationId, message);
      await sleep(10); // Small delay to ensure distinct timestamps
    }

    // Retrieve and verify messages
    const retrievedMessages = await chatMemory.get(conversationId, 10);

    // Check the total count matches
    expect(retrievedMessages).toHaveLength(expectedMessages.length);

    // Check each message is in the expected order
    for (let i = 0; i < expectedMessages.length; i++) {
      const expected = expectedMessages[i];
      const actual = retrievedMessages[i];
      expect(actual).toBeDefined();
      if (!actual || !expected) {
        continue;
      }

      // Verify message types match
      expect(actual.messageType).toBe(expected.messageType);

      // Verify message content matches
      expect(actual.text).toBe(expected.text);

      // For each specific message type, verify type-specific properties
      if (expected instanceof SystemMessage) {
        expect(actual).toBeInstanceOf(SystemMessage);
      } else if (expected instanceof UserMessage) {
        expect(actual).toBeInstanceOf(UserMessage);
      } else if (expected instanceof AssistantMessage) {
        expect(actual).toBeInstanceOf(AssistantMessage);

        // If the original had tool calls, verify they're preserved
        if (expected.hasToolCalls()) {
          const expectedAssistant = expected as AssistantMessage;
          const actualAssistant = actual as AssistantMessage;

          expect(actualAssistant.hasToolCalls()).toBe(true);
          expect(actualAssistant.toolCalls).toHaveLength(
            expectedAssistant.toolCalls.length,
          );

          // Check first tool call details
          expect(actualAssistant.toolCalls[0]?.name).toBe(
            expectedAssistant.toolCalls[0]?.name,
          );
        }
      } else if (expected instanceof ToolResponseMessage) {
        expect(actual).toBeInstanceOf(ToolResponseMessage);

        const expectedTool = expected as ToolResponseMessage;
        const actualTool = actual as ToolResponseMessage;

        expect(actualTool.responses).toHaveLength(
          expectedTool.responses.length,
        );

        // Check response details
        expect(actualTool.responses[0]?.name).toBe(
          expectedTool.responses[0]?.name,
        );
        expect(actualTool.responses[0]?.id).toBe(expectedTool.responses[0]?.id);
      }
    }
  });

  it("get messages after multiple adds should return messages in correct order", async () => {
    const conversationId = "sequential-adds-test";

    // Create messages that will be added individually
    const userMessage1 = new UserMessage({ content: "First user message" });
    const assistantMessage1 = new AssistantMessage({
      content: "First assistant response",
    });
    const userMessage2 = new UserMessage({ content: "Second user message" });
    const assistantMessage2 = new AssistantMessage({
      content: "Second assistant response",
    });
    const userMessage3 = new UserMessage({ content: "Third user message" });
    const assistantMessage3 = new AssistantMessage({
      content: "Third assistant response",
    });

    // Add messages one at a time with delays to simulate real conversation
    await chatMemory.add(conversationId, userMessage1);
    await sleep(50);
    await chatMemory.add(conversationId, assistantMessage1);
    await sleep(50);
    await chatMemory.add(conversationId, userMessage2);
    await sleep(50);
    await chatMemory.add(conversationId, assistantMessage2);
    await sleep(50);
    await chatMemory.add(conversationId, userMessage3);
    await sleep(50);
    await chatMemory.add(conversationId, assistantMessage3);

    // Create the expected message order
    const expectedMessages: Message[] = [
      userMessage1,
      assistantMessage1,
      userMessage2,
      assistantMessage2,
      userMessage3,
      assistantMessage3,
    ];

    // Retrieve all messages
    const retrievedMessages = await chatMemory.get(conversationId, 10);

    // Check count matches
    expect(retrievedMessages).toHaveLength(expectedMessages.length);

    // Verify each message is in the correct order with correct content
    for (let i = 0; i < expectedMessages.length; i++) {
      const expected = expectedMessages[i];
      const actual = retrievedMessages[i];
      expect(actual).toBeDefined();
      if (!actual || !expected) {
        continue;
      }

      expect(actual.messageType).toBe(expected.messageType);
      expect(actual.text).toBe(expected.text);
    }

    // Test with a limit
    const limitedMessages = await chatMemory.get(conversationId, 3);

    // Should get the 3 oldest messages
    expect(limitedMessages).toHaveLength(3);
    expect(limitedMessages[0]?.text).toBe(userMessage1.text);
    expect(limitedMessages[1]?.text).toBe(assistantMessage1.text);
    expect(limitedMessages[2]?.text).toBe(userMessage2.text);
  });
});
