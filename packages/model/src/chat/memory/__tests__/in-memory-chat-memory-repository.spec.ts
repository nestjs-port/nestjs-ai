import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Message } from "../../messages";
import { AssistantMessage, UserMessage } from "../../messages";
import { InMemoryChatMemoryRepository } from "../in-memory-chat-memory-repository";

function summarizeMessages(messages: Message[]): Array<{
  messageType: Message["messageType"];
  text: Message["text"];
}> {
  return messages.map((message) => ({
    messageType: message.messageType,
    text: message.text,
  }));
}

describe("InMemoryChatMemoryRepository", () => {
  it("find conversation ids", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId1 = randomUUID();
    const conversationId2 = randomUUID();
    const messages1: Message[] = [new UserMessage({ content: "Hello" })];
    const messages2: Message[] = [
      new AssistantMessage({ content: "Hi there" }),
    ];

    chatMemoryRepository.saveAll(conversationId1, messages1);
    chatMemoryRepository.saveAll(conversationId2, messages2);

    const ids = chatMemoryRepository.findConversationIds();
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([conversationId1, conversationId2]),
    );

    chatMemoryRepository.deleteByConversationId(conversationId1);
    expect(chatMemoryRepository.findConversationIds()).toEqual([
      conversationId2,
    ]);
  });

  it("save messages and find multiple messages in conversation", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const messages: Message[] = [
      new AssistantMessage({ content: "I, Robot" }),
      new UserMessage({ content: "Hello" }),
    ];

    chatMemoryRepository.saveAll(conversationId, messages);

    expect(
      summarizeMessages(
        chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages(messages));

    chatMemoryRepository.deleteByConversationId(conversationId);

    expect(chatMemoryRepository.findByConversationId(conversationId)).toEqual(
      [],
    );
  });

  it("save messages and find single message in conversation", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const message: Message = new UserMessage({ content: "Hello" });
    const messages: Message[] = [message];

    chatMemoryRepository.saveAll(conversationId, messages);

    expect(
      summarizeMessages(
        chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages([message]));

    chatMemoryRepository.deleteByConversationId(conversationId);

    expect(chatMemoryRepository.findByConversationId(conversationId)).toEqual(
      [],
    );
  });

  it("find non-existing conversation", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();

    expect(chatMemoryRepository.findByConversationId(conversationId)).toEqual(
      [],
    );
  });

  it("subsequent save overwrites previous version", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const firstMessages: Message[] = [new UserMessage({ content: "Hello" })];
    const secondMessages: Message[] = [
      new AssistantMessage({ content: "Hi there" }),
    ];

    chatMemoryRepository.saveAll(conversationId, firstMessages);
    chatMemoryRepository.saveAll(conversationId, secondMessages);

    expect(
      summarizeMessages(
        chatMemoryRepository.findByConversationId(conversationId),
      ),
    ).toEqual(summarizeMessages(secondMessages));
  });

  it("null conversation id not allowed", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();

    expect(() =>
      chatMemoryRepository.saveAll(null as unknown as string, [
        new UserMessage({ content: "Hello" }),
      ]),
    ).toThrow("conversationId cannot be null or empty");

    expect(() =>
      chatMemoryRepository.findByConversationId(null as unknown as string),
    ).toThrow("conversationId cannot be null or empty");

    expect(() =>
      chatMemoryRepository.deleteByConversationId(null as unknown as string),
    ).toThrow("conversationId cannot be null or empty");
  });

  it("empty conversation id not allowed", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();

    expect(() =>
      chatMemoryRepository.saveAll("", [new UserMessage({ content: "Hello" })]),
    ).toThrow("conversationId cannot be null or empty");

    expect(() => chatMemoryRepository.findByConversationId("")).toThrow(
      "conversationId cannot be null or empty",
    );

    expect(() => chatMemoryRepository.deleteByConversationId("")).toThrow(
      "conversationId cannot be null or empty",
    );
  });

  it("null messages not allowed", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();

    expect(() =>
      chatMemoryRepository.saveAll(
        conversationId,
        null as unknown as Message[],
      ),
    ).toThrow("messages cannot be null");
  });

  it("messages with null elements not allowed", () => {
    const chatMemoryRepository = new InMemoryChatMemoryRepository();
    const conversationId = randomUUID();
    const messagesWithNull = [null as unknown as Message];

    expect(() =>
      chatMemoryRepository.saveAll(conversationId, messagesWithNull),
    ).toThrow("messages cannot contain null elements");
  });
});
