import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Message } from "../../messages";
import { AssistantMessage, SystemMessage, UserMessage } from "../../messages";
import { InMemoryChatMemoryRepository } from "../in-memory-chat-memory-repository";
import { MessageWindowChatMemory } from "../message-window-chat-memory";

function summarizeMessages(messages: Message[]): Array<{
  messageType: Message["messageType"];
  text: Message["text"];
}> {
  return messages.map((message) => ({
    messageType: message.messageType,
    text: message.text,
  }));
}

describe("MessageWindowChatMemory", () => {
  it("zero max messages not allowed", () => {
    expect(
      () =>
        new MessageWindowChatMemory({
          chatMemoryRepository: new InMemoryChatMemoryRepository(),
          maxMessages: 0,
        }),
    ).toThrow("maxMessages must be greater than 0");
  });

  it("negative max messages not allowed", () => {
    expect(
      () =>
        new MessageWindowChatMemory({
          chatMemoryRepository: new InMemoryChatMemoryRepository(),
          maxMessages: -1,
        }),
    ).toThrow("maxMessages must be greater than 0");
  });

  it("handle multiple messages in conversation", async () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({ content: "I, Robot" }),
      new UserMessage({ content: "Hello" }),
    ];

    chatMemory.add(conversationId, messages);

    expect(summarizeMessages(await chatMemory.get(conversationId))).toEqual(
      summarizeMessages(messages),
    );

    chatMemory.clear(conversationId);

    expect(await chatMemory.get(conversationId)).toEqual([]);
  });

  it("handle single message in conversation", async () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();
    const message = new UserMessage({ content: "Hello" });

    chatMemory.add(conversationId, message);

    expect(summarizeMessages(await chatMemory.get(conversationId))).toEqual(
      summarizeMessages([message]),
    );

    chatMemory.clear(conversationId);

    expect(await chatMemory.get(conversationId)).toEqual([]);
  });

  it("null conversation id not allowed", () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });

    expect(() =>
      chatMemory.add(null as unknown as string, [
        new UserMessage({ content: "Hello" }),
      ]),
    ).toThrow("conversationId cannot be null or empty");

    expect(() =>
      chatMemory.add(
        null as unknown as string,
        new UserMessage({ content: "Hello" }),
      ),
    ).toThrow("conversationId cannot be null or empty");

    expect(() => chatMemory.get(null as unknown as string)).toThrow(
      "conversationId cannot be null or empty",
    );

    expect(() => chatMemory.clear(null as unknown as string)).toThrow(
      "conversationId cannot be null or empty",
    );
  });

  it("empty conversation id not allowed", () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });

    expect(() =>
      chatMemory.add("", [new UserMessage({ content: "Hello" })]),
    ).toThrow("conversationId cannot be null or empty");

    expect(() =>
      chatMemory.add("", new UserMessage({ content: "Hello" })),
    ).toThrow("conversationId cannot be null or empty");

    expect(() => chatMemory.get("")).toThrow(
      "conversationId cannot be null or empty",
    );

    expect(() => chatMemory.clear("")).toThrow(
      "conversationId cannot be null or empty",
    );
  });

  it("null messages not allowed", () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    expect(() =>
      chatMemory.add(conversationId, null as unknown as Message[]),
    ).toThrow("message cannot be null");
  });

  it("null message not allowed", () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    expect(() =>
      chatMemory.add(conversationId, null as unknown as Message),
    ).toThrow("message cannot be null");
  });

  it("messages with null elements not allowed", () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    expect(() =>
      chatMemory.add(conversationId, [null as unknown as Message]),
    ).toThrow("messages cannot contain null elements");
  });

  it("custom max messages", async () => {
    const conversationId = randomUUID();
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 2,
    });

    const messages: Message[] = [
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
      new UserMessage({ content: "Message 3" }),
    ];

    customChatMemory.add(conversationId, messages);
    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(2);
  });

  it("no eviction when messages within limit", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 3,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Hello" }),
      new AssistantMessage({ content: "Hi there" }),
    ]);
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "How are you?" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(3);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new UserMessage({ content: "Hello" }),
        new AssistantMessage({ content: "Hi there" }),
        new UserMessage({ content: "How are you?" }),
      ]),
    );
  });

  it("eviction when messages exceed limit", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 2,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
    ]);
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(2);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new UserMessage({ content: "Message 2" }),
        new AssistantMessage({ content: "Response 2" }),
      ]),
    );
  });

  it("system message is preserved during eviction", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 3,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new SystemMessage({ content: "System instruction" }),
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
    ]);
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(3);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new SystemMessage({ content: "System instruction" }),
        new UserMessage({ content: "Message 2" }),
        new AssistantMessage({ content: "Response 2" }),
      ]),
    );
  });

  it("multiple system messages are preserved during eviction", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 3,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new SystemMessage({ content: "System instruction 1" }),
      new SystemMessage({ content: "System instruction 2" }),
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
    ]);
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(3);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new SystemMessage({ content: "System instruction 1" }),
        new SystemMessage({ content: "System instruction 2" }),
        new AssistantMessage({ content: "Response 2" }),
      ]),
    );
  });

  it("empty message list", async () => {
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    const result = await chatMemory.get(conversationId);

    expect(result).toEqual([]);
  });

  it("old system messages are removed when new one added", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 2,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new SystemMessage({ content: "System instruction 1" }),
      new SystemMessage({ content: "System instruction 2" }),
    ]);
    customChatMemory.add(conversationId, [
      new SystemMessage({ content: "System instruction 3" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(1);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new SystemMessage({ content: "System instruction 3" }),
      ]),
    );
  });

  it("mixed messages with limit equal to system message count", async () => {
    const customChatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
      maxMessages: 2,
    });

    const conversationId = randomUUID();
    customChatMemory.add(conversationId, [
      new SystemMessage({ content: "System instruction 1" }),
      new SystemMessage({ content: "System instruction 2" }),
    ]);
    customChatMemory.add(conversationId, [
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
    ]);

    const result = await customChatMemory.get(conversationId);

    expect(result).toHaveLength(2);
    expect(summarizeMessages(result)).toEqual(
      summarizeMessages([
        new SystemMessage({ content: "System instruction 1" }),
        new SystemMessage({ content: "System instruction 2" }),
      ]),
    );
  });
});
