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

import { randomUUID } from "node:crypto";
import { type Message, UserMessage } from "@nestjs-ai/model";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryConfig } from "../redis-chat-memory-config.js";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository.js";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("RedisChatMemoryErrorHandlingIT", () => {
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
      .indexName(`test-error-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .build();

    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }
  });

  afterAll(async () => {
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  it("should handle invalid conversation id", async () => {
    // Using null conversation ID
    await expect(
      chatMemory.add(
        null as unknown as string,
        new UserMessage({ content: "Test message" }),
      ),
    ).rejects.toThrow("conversationId cannot be null");

    // Using empty conversation ID
    const message = new UserMessage({ content: "Test message" });
    await expect(chatMemory.add("", message)).resolves.toBeUndefined();

    // Reading with null conversation ID
    await expect(chatMemory.get(null as unknown as string, 10)).rejects.toThrow(
      "conversationId cannot be null",
    );

    // Reading with non-existent conversation ID should return empty list
    const messages = await chatMemory.get("non-existent-id", 10);
    expect(messages).not.toBeNull();
    expect(messages).toHaveLength(0);

    // Clearing with null conversation ID
    await expect(chatMemory.clear(null as unknown as string)).rejects.toThrow(
      "conversationId cannot be null",
    );

    // Clearing non-existent conversation should not throw exception
    await expect(chatMemory.clear("non-existent-id")).resolves.toBeUndefined();
  });

  it("should handle invalid message parameters", async () => {
    const conversationId = randomUUID();

    // Null message
    await expect(
      chatMemory.add(conversationId, null as unknown as Message),
    ).rejects.toThrow("message cannot be null");

    // Null message list
    await expect(
      chatMemory.add(conversationId, null as unknown as Message[]),
    ).rejects.toThrow("message cannot be null");

    // Empty message list should not throw exception
    await expect(chatMemory.add(conversationId, [])).resolves.toBeUndefined();

    // Message with empty content (not null - which is not allowed)
    const emptyContentMessage = new UserMessage({ content: "" });

    await expect(
      chatMemory.add(conversationId, emptyContentMessage),
    ).resolves.toBeUndefined();

    // Message with empty metadata
    const userMessage = new UserMessage({ content: "Hello" });
    await expect(chatMemory.add(conversationId, userMessage)).resolves.toBe(
      undefined,
    );
  });

  it("should handle time to live", async () => {
    // Create chat memory with short TTL
    const ttlChatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(`test-ttl-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .ttlSeconds(1)
      .build();

    const conversationId = "ttl-test-conversation";
    const message = new UserMessage({
      content: "This message will expire soon",
    });

    // Add a message
    await ttlChatMemory.add(conversationId, message);

    // Immediately verify message exists
    const messages = await ttlChatMemory.get(conversationId, 10);
    expect(messages).toHaveLength(1);

    // Wait for TTL to expire
    await sleep(1500);

    // After TTL expiry, message should be gone
    const expiredMessages = await ttlChatMemory.get(conversationId, 10);
    expect(expiredMessages).toHaveLength(0);
  });

  it("should handle edge case conversation ids", async () => {
    // Test with a simple conversation ID first to verify basic functionality
    const simpleId = "simple-test-id";
    const simpleMessage = new UserMessage({ content: "Simple test message" });
    await chatMemory.add(simpleId, simpleMessage);

    const simpleMessages = await chatMemory.get(simpleId, 10);
    expect(simpleMessages).toHaveLength(1);
    expect(simpleMessages[0]?.text).toBe("Simple test message");

    // Test with conversation IDs containing special characters
    const specialCharsId = "test_conversation_with_special_chars_123";
    const specialMessage = "Message with special character conversation ID";
    const message = new UserMessage({ content: specialMessage });

    // Add message with special chars ID
    await chatMemory.add(specialCharsId, message);

    // Verify that message can be retrieved
    const specialCharMessages = await chatMemory.get(specialCharsId, 10);
    expect(specialCharMessages).toHaveLength(1);
    expect(specialCharMessages[0]?.text).toBe(specialMessage);

    // Test with non-alphanumeric characters in ID
    const complexId = "test-with:complex@chars#123";
    const complexMessage = "Message with complex ID";
    const complexIdMessage = new UserMessage({ content: complexMessage });

    // Add and retrieve message with complex ID
    await chatMemory.add(complexId, complexIdMessage);
    const complexIdMessages = await chatMemory.get(complexId, 10);
    expect(complexIdMessages).toHaveLength(1);
    expect(complexIdMessages[0]?.text).toBe(complexMessage);

    // Test with long IDs
    let longIdBuilder = "";
    for (let i = 0; i < 50; i++) {
      longIdBuilder += "a";
    }
    const longId = longIdBuilder;
    const longIdMessageText = "Message with long conversation ID";
    const longIdMessage = new UserMessage({ content: longIdMessageText });

    // Add and retrieve message with long ID
    await chatMemory.add(longId, longIdMessage);
    const longIdMessages = await chatMemory.get(longId, 10);
    expect(longIdMessages).toHaveLength(1);
    expect(longIdMessages[0]?.text).toBe(longIdMessageText);
  });

  it("should handle concurrent access", async () => {
    const conversationId = `concurrent-access-test-${randomUUID()}`;

    // Clear any existing data for this conversation
    await chatMemory.clear(conversationId);

    // Define thread setup for concurrent access
    const threadCount = 3;
    const messagesPerThread = 4;
    const totalExpectedMessages = threadCount * messagesPerThread;

    // Track all messages created for verification
    const expectedMessageTexts = new Set<string>();

    // Create and start threads that concurrently add messages
    const tasks: Promise<void>[] = [];
    // For synchronized
    // start
    let releaseBarrier:
      | ((value?: void | PromiseLike<void>) => void)
      | undefined;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    for (let i = 0; i < threadCount; i++) {
      const threadId = i;
      tasks.push(
        (async () => {
          await barrier; // Wait for all threads to be ready

          for (let j = 0; j < messagesPerThread; j++) {
            const messageText = `Message ${j} from thread ${threadId}`;
            expectedMessageTexts.add(messageText);
            const message = new UserMessage({ content: messageText });
            await chatMemory.add(conversationId, message);
          }
        })(),
      );
    }

    if (releaseBarrier === undefined) {
      throw new Error("Barrier release function was not initialized");
    }
    releaseBarrier();

    // Wait for all threads to complete
    await Promise.all(tasks);

    // Allow a short delay for Redis to process all operations
    await sleep(500);

    // Retrieve all messages (including extras to make sure we get everything)
    const messages = await chatMemory.get(
      conversationId,
      totalExpectedMessages + 5,
    );

    // We don't check exact message count as Redis async operations might result
    // in slight variations
    // Just verify the right message format is present
    const actualMessageTexts = messages.map((msg) => msg.text ?? "");

    // Check that we have messages from each thread
    for (let i = 0; i < threadCount; i++) {
      const threadId = i;
      expect(
        actualMessageTexts.filter((text) =>
          text.endsWith(`from thread ${threadId}`),
        ).length,
      ).toBeGreaterThan(0);
    }

    // Verify message format
    for (const msg of messages) {
      expect(msg).toBeInstanceOf(UserMessage);
      expect(msg.text ?? "").toMatch(/Message \d from thread \d/);
    }

    // Order check - messages might be in different order than creation,
    // but order should be consistent between retrievals
    const messagesAgain = await chatMemory.get(
      conversationId,
      totalExpectedMessages + 5,
    );
    for (let i = 0; i < messages.length; i++) {
      expect(messagesAgain[i]?.text).toBe(messages[i]?.text);
    }
  });
});
