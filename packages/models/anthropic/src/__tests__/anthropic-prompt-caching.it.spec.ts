/*
 * Copyright 2026-present the original author or authors.
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Model as AnthropicModel,
  Usage as AnthropicSdkUsage,
} from "@anthropic-ai/sdk/resources/messages";
import type { ChatResponse, Message } from "@nestjs-ai/model";
import {
  FunctionToolCallback,
  MessageType,
  Prompt,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { describe, expect, it } from "vitest";

import {
  AnthropicCacheOptions,
  AnthropicCacheStrategy,
  AnthropicCacheTtl,
  AnthropicChatModel,
  AnthropicChatOptions,
} from "../index";
import {
  MockWeatherService,
  type WeatherRequest,
  WeatherRequestSchema,
  type WeatherResponse,
} from "./mock-weather-service";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEST_MODEL: AnthropicModel = "claude-sonnet-4-20250514";

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicPromptCachingIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory());
  const logger = LoggerFactory.getLogger("AnthropicPromptCachingIT");
  const chatModel = new AnthropicChatModel();

  function loadPrompt(filename: string): string {
    try {
      const basePrompt = readFileSync(
        resolve(__dirname, "resources", filename),
        "utf8",
      );
      return `${basePrompt}\n\nTest execution timestamp: ${Date.now()}`;
    } catch (error) {
      throw new Error(`Failed to load prompt: ${filename}`, {
        cause: error,
      });
    }
  }

  function getSdkUsage(
    response: ChatResponse | null | undefined,
  ): AnthropicSdkUsage | null {
    const nativeUsage = response?.metadata?.usage?.nativeUsage;
    if (nativeUsage == null || typeof nativeUsage !== "object") {
      return null;
    }
    return nativeUsage as AnthropicSdkUsage;
  }

  it("should cache system message only", async () => {
    const systemPrompt = loadPrompt("system-only-cache-prompt.txt");

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(
        new AnthropicCacheOptions({
          strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
        }),
      )
      .maxTokens(150)
      .temperature(0.3)
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: systemPrompt }),
          new UserMessage({ content: "What is microservices architecture?" }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    expect(response.result?.output.text).toMatch(/\S/);
    logger.info("System-only cache response: {}", response.result?.output.text);

    const usage = getSdkUsage(response);
    expect(usage).not.toBeNull();
    if (usage == null) {
      throw new Error("Expected SDK usage to be present");
    }

    const cacheCreation = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    assertTrue(
      cacheCreation > 0 || cacheRead > 0,
      `Expected either cache creation or cache read tokens, but got creation=${cacheCreation}, read=${cacheRead}`,
    );

    logger.info(
      "Cache creation tokens: {}, Cache read tokens: {}",
      cacheCreation,
      cacheRead,
    );
  });

  it("should cache system and tools", async () => {
    const systemPrompt = loadPrompt("system-and-tools-cache-prompt.txt");

    const weatherService = new MockWeatherService();
    const weatherTool = FunctionToolCallback.builder<
      WeatherRequest,
      WeatherResponse
    >("getCurrentWeather", weatherService.apply.bind(weatherService))
      .description("Get current weather for a location")
      .inputType(WeatherRequestSchema)
      .build();

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(
        new AnthropicCacheOptions({
          strategy: AnthropicCacheStrategy.SYSTEM_AND_TOOLS,
        }),
      )
      .maxTokens(200)
      .temperature(0.3)
      .toolCallbacks([weatherTool])
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: systemPrompt }),
          new UserMessage({
            content:
              "What's the weather like in San Francisco and should I go for a walk?",
          }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    expect(response.result?.output.text).toMatch(/\S/);
    logger.info(
      "System and tools cache response: {}",
      response.result?.output.text,
    );

    const usage = getSdkUsage(response);
    if (usage != null) {
      const cacheCreation = usage.cache_creation_input_tokens ?? 0;
      const cacheRead = usage.cache_read_input_tokens ?? 0;
      assertTrue(
        cacheCreation > 0 || cacheRead > 0,
        `Expected either cache creation or cache read tokens, but got creation=${cacheCreation}, read=${cacheRead}`,
      );
      logger.info(
        "Cache creation tokens: {}, Cache read tokens: {}",
        cacheCreation,
        cacheRead,
      );
    } else {
      logger.debug(
        "Native usage metadata not available for tool-based interactions - this is expected",
      );
      expect(response.result?.output.text).toMatch(/\S/);
    }
  });

  it("should cache conversation history", async () => {
    const systemPrompt = loadPrompt("system-only-cache-prompt.txt");

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
    });
    cacheOptions.messageTypeMinContentLengths.set(MessageType.USER, 0);

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(cacheOptions)
      .maxTokens(200)
      .temperature(0.3)
      .build();

    const conversationHistory: Message[] = [];
    conversationHistory.push(new SystemMessage({ content: systemPrompt }));

    // Turn 1
    conversationHistory.push(
      new UserMessage({
        content: "What is quantum computing? Please explain the basics.",
      }),
    );
    const turn1 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn1).not.toBeNull();
    const turn1Output = turn1.result?.output;
    if (turn1Output == null) {
      throw new Error("Expected turn 1 output to be present");
    }
    conversationHistory.push(turn1Output);

    const usage1 = getSdkUsage(turn1);
    expect(usage1).not.toBeNull();
    if (usage1 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    const turn1Creation = usage1.cache_creation_input_tokens ?? 0;
    logger.info(
      "Turn 1 - Cache creation: {}, Cache read: {}",
      turn1Creation,
      usage1.cache_read_input_tokens ?? 0,
    );

    // Turn 2
    conversationHistory.push(
      new UserMessage({ content: "How does quantum entanglement work?" }),
    );
    const turn2 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn2).not.toBeNull();
    const turn2Output = turn2.result?.output;
    if (turn2Output == null) {
      throw new Error("Expected turn 2 output to be present");
    }
    conversationHistory.push(turn2Output);

    const usage2 = getSdkUsage(turn2);
    expect(usage2).not.toBeNull();
    if (usage2 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    if (turn1Creation > 0) {
      assertGreaterThan(
        usage2.cache_read_input_tokens ?? 0,
        0,
        "Turn 2 should read cache from Turn 1",
      );
    }
    logger.info(
      "Turn 2 - Cache creation: {}, Cache read: {}",
      usage2.cache_creation_input_tokens ?? 0,
      usage2.cache_read_input_tokens ?? 0,
    );

    // If caching started in turn 1, turn 2 should see cache reads

    // Turn 3
    conversationHistory.push(
      new UserMessage({
        content:
          "Can you give me a practical example of quantum computing application?",
      }),
    );
    const turn3 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn3).not.toBeNull();
    const turn3Output = turn3.result?.output;
    if (turn3Output == null) {
      throw new Error("Expected turn 3 output to be present");
    }
    conversationHistory.push(turn3Output);

    const usage3 = getSdkUsage(turn3);
    expect(usage3).not.toBeNull();
    if (usage3 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    if (turn1Creation > 0 || (usage2.cache_creation_input_tokens ?? 0) > 0) {
      assertGreaterThan(
        usage3.cache_read_input_tokens ?? 0,
        0,
        "Turn 3 should read cache",
      );
    }
    logger.info(
      "Turn 3 - Cache creation: {}, Cache read: {}",
      usage3.cache_creation_input_tokens ?? 0,
      usage3.cache_read_input_tokens ?? 0,
    );

    // Turn 4
    conversationHistory.push(
      new UserMessage({
        content: "What are the limitations of current quantum computers?",
      }),
    );
    const turn4 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn4).not.toBeNull();

    const usage4 = getSdkUsage(turn4);
    expect(usage4).not.toBeNull();
    if (usage4 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    const cachingStarted =
      turn1Creation > 0 ||
      (usage2.cache_creation_input_tokens ?? 0) > 0 ||
      (usage3.cache_creation_input_tokens ?? 0) > 0;
    assertTrue(cachingStarted, "Caching should have started by turn 4");
    if (cachingStarted) {
      assertGreaterThan(
        usage4.cache_read_input_tokens ?? 0,
        0,
        "Turn 4 should read cache",
      );
    }

    // Summary
    logger.info(
      "Turn 1 - Created: {}, Read: {}",
      usage1.cache_creation_input_tokens ?? 0,
      usage1.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 2 - Created: {}, Read: {}",
      usage2.cache_creation_input_tokens ?? 0,
      usage2.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 3 - Created: {}, Read: {}",
      usage3.cache_creation_input_tokens ?? 0,
      usage3.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 4 - Created: {}, Read: {}",
      usage4.cache_creation_input_tokens ?? 0,
      usage4.cache_read_input_tokens ?? 0,
    );
  });

  it("should respect min length for system caching", async () => {
    const systemPrompt = loadPrompt("system-only-cache-prompt.txt");

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
    });
    cacheOptions.messageTypeMinContentLengths.set(
      MessageType.SYSTEM,
      systemPrompt.length + 1,
    );

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(cacheOptions)
      .maxTokens(60)
      .temperature(0.2)
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: systemPrompt }),
          new UserMessage({ content: "Ping" }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    const usage = getSdkUsage(response);
    expect(usage).not.toBeNull();
    if (usage == null) {
      throw new Error("Expected SDK usage to be present");
    }
    assertTrue(
      (usage.cache_creation_input_tokens ?? 0) === 0,
      "No cache should be created below min length",
    );
    assertTrue(
      (usage.cache_read_input_tokens ?? 0) === 0,
      "No cache read expected below min length",
    );
  });

  it("should handle extended ttl caching", async () => {
    const systemPrompt = loadPrompt("extended-ttl-cache-prompt.txt");

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
    });
    cacheOptions.messageTypeTtl.set(
      MessageType.SYSTEM,
      AnthropicCacheTtl.ONE_HOUR,
    );

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(cacheOptions)
      .maxTokens(100)
      .temperature(0.3)
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: systemPrompt }),
          new UserMessage({ content: "What is 2+2?" }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    expect(response.result?.output.text ?? "").toContain("4");
    logger.info(
      "Extended TTL cache response: {}",
      response.result?.output.text,
    );

    const usage = getSdkUsage(response);
    expect(usage).not.toBeNull();
    if (usage == null) {
      throw new Error("Expected SDK usage to be present");
    }
    const cacheCreation = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    assertTrue(
      cacheCreation > 0 || cacheRead > 0,
      `Expected either cache creation or cache read tokens, but got creation=${cacheCreation}, read=${cacheRead}`,
    );

    logger.info(
      "Extended TTL - Cache creation: {}, Cache read: {}",
      cacheCreation,
      cacheRead,
    );
  });

  it("should not cache with none strategy", async () => {
    const options = AnthropicChatOptions.builder()
      .cacheOptions(
        new AnthropicCacheOptions({
          strategy: AnthropicCacheStrategy.NONE,
        }),
      )
      .maxTokens(50)
      .temperature(0.3)
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: "You are a helpful assistant." }),
          new UserMessage({ content: "Hello!" }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    expect(response.result?.output.text).toMatch(/\S/);

    const usage = getSdkUsage(response);
    expect(usage).not.toBeNull();
    if (usage == null) {
      throw new Error("Expected SDK usage to be present");
    }
    expect(usage.cache_creation_input_tokens ?? 0).toBe(0);
    expect(usage.cache_read_input_tokens ?? 0).toBe(0);
  });

  it("should demonstrate incremental caching across multiple turns", async () => {
    const largeSystemPrompt = loadPrompt("system-only-cache-prompt.txt");

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
    });
    cacheOptions.messageTypeMinContentLengths.set(MessageType.USER, 0);

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(cacheOptions)
      .maxTokens(200)
      .temperature(0.3)
      .build();

    const conversationHistory: Message[] = [];
    conversationHistory.push(new SystemMessage({ content: largeSystemPrompt }));

    // Turn 1
    conversationHistory.push(
      new UserMessage({
        content: "What is quantum computing? Please explain the basics.",
      }),
    );
    const turn1 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn1).not.toBeNull();
    const turn1Output = turn1.result?.output;
    if (turn1Output == null) {
      throw new Error("Expected turn 1 output to be present");
    }
    conversationHistory.push(turn1Output);

    const usage1 = getSdkUsage(turn1);
    expect(usage1).not.toBeNull();
    if (usage1 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    let cachingStarted = (usage1.cache_creation_input_tokens ?? 0) > 0;

    // Turn 2
    conversationHistory.push(
      new UserMessage({
        content: "How does quantum entanglement work in this context?",
      }),
    );
    const turn2 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn2).not.toBeNull();
    const turn2Output = turn2.result?.output;
    if (turn2Output == null) {
      throw new Error("Expected turn 2 output to be present");
    }
    conversationHistory.push(turn2Output);

    const usage2 = getSdkUsage(turn2);
    expect(usage2).not.toBeNull();
    if (usage2 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    if (cachingStarted) {
      assertGreaterThan(
        usage2.cache_read_input_tokens ?? 0,
        0,
        "Turn 2 should read cache from Turn 1",
      );
    }
    cachingStarted =
      cachingStarted || (usage2.cache_creation_input_tokens ?? 0) > 0;

    // Turn 3
    conversationHistory.push(
      new UserMessage({
        content:
          "Can you give me a practical example of quantum computing application?",
      }),
    );
    const turn3 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn3).not.toBeNull();
    const turn3Output = turn3.result?.output;
    if (turn3Output == null) {
      throw new Error("Expected turn 3 output to be present");
    }
    conversationHistory.push(turn3Output);

    const usage3 = getSdkUsage(turn3);
    expect(usage3).not.toBeNull();
    if (usage3 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    if (cachingStarted) {
      assertGreaterThan(
        usage3.cache_read_input_tokens ?? 0,
        0,
        "Turn 3 should read cache",
      );
    }
    cachingStarted =
      cachingStarted || (usage3.cache_creation_input_tokens ?? 0) > 0;

    // Turn 4
    conversationHistory.push(
      new UserMessage({
        content: "What are the limitations of current quantum computers?",
      }),
    );
    const turn4 = await chatModel.call(
      new Prompt(conversationHistory, options),
    );
    expect(turn4).not.toBeNull();

    const usage4 = getSdkUsage(turn4);
    expect(usage4).not.toBeNull();
    if (usage4 == null) {
      throw new Error("Expected SDK usage to be present");
    }
    assertTrue(cachingStarted, "Caching should have started by turn 4");
    if (cachingStarted) {
      assertGreaterThan(
        usage4.cache_read_input_tokens ?? 0,
        0,
        "Turn 4 should read cache",
      );
    }

    // Summary
    logger.info(
      "Turn 1 - Created: {}, Read: {}",
      usage1.cache_creation_input_tokens ?? 0,
      usage1.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 2 - Created: {}, Read: {}",
      usage2.cache_creation_input_tokens ?? 0,
      usage2.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 3 - Created: {}, Read: {}",
      usage3.cache_creation_input_tokens ?? 0,
      usage3.cache_read_input_tokens ?? 0,
    );
    logger.info(
      "Turn 4 - Created: {}, Read: {}",
      usage4.cache_creation_input_tokens ?? 0,
      usage4.cache_read_input_tokens ?? 0,
    );
  });

  it("should cache static prefix with multi block system caching", async () => {
    const staticSystemPrompt = loadPrompt("system-only-cache-prompt.txt");
    const dynamicSystemPrompt = `Current user session ID: ${Date.now()}`;

    const cacheOptions = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
      multiBlockSystemCaching: true,
    });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .cacheOptions(cacheOptions)
      .maxTokens(150)
      .temperature(0.3)
      .build();

    const response = await chatModel.call(
      new Prompt(
        [
          new SystemMessage({ content: staticSystemPrompt }),
          new SystemMessage({ content: dynamicSystemPrompt }),
          new UserMessage({ content: "What is microservices architecture?" }),
        ],
        options,
      ),
    );

    expect(response).not.toBeNull();
    expect(response.result?.output.text).toMatch(/\S/);
    logger.info(
      "Multi-block system cache response: {}",
      response.result?.output.text,
    );

    const usage = getSdkUsage(response);
    expect(usage).not.toBeNull();
    if (usage == null) {
      throw new Error("Expected SDK usage to be present");
    }
    const cacheCreation = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    assertTrue(
      cacheCreation > 0 || cacheRead > 0,
      `Expected either cache creation or cache read tokens, but got creation=${cacheCreation}, read=${cacheRead}`,
    );

    logger.info(
      "Multi-block - Cache creation: {}, Cache read: {}",
      cacheCreation,
      cacheRead,
    );
  });
});

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertGreaterThan(
  value: number,
  threshold: number,
  message: string,
): void {
  if (!(value > threshold)) {
    throw new Error(message);
  }
}
