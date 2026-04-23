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

import {
  ChatClient,
  MessageChatMemoryAdvisor,
  ToolCallAdvisor,
} from "@nestjs-ai/client-chat";
import {
  FunctionToolCallback,
  InMemoryChatMemoryRepository,
  MessageWindowChatMemory,
  ToolMetadata,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../../open-ai-chat-options";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "../mock-weather-service";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiToolCallAdvisorIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("OpenAiToolCallAdvisorIT");

  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  function createWeatherToolCallback() {
    return FunctionToolCallback.builder(
      "getCurrentWeather",
      (request: MockWeatherRequest) => new MockWeatherService().apply(request),
    )
      .description("Get the weather in location")
      .inputType(MockWeatherRequestInputType)
      .build();
  }

  function createReturnDirectWeatherToolCallback() {
    return FunctionToolCallback.builder(
      "getCurrentWeather",
      (request: MockWeatherRequest) => new MockWeatherService().apply(request),
    )
      .description("Get the weather in location")
      .inputType(MockWeatherRequestInputType)
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .build();
  }

  describe("CallTests", () => {
    it("call multiple tool invocations", async () => {
      const response = await ChatClient.create(chatModel)
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user((u) =>
          u.text(
            "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
          ),
        )
        .toolCallbacks(createWeatherToolCallback())
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("call multiple tool invocations with external memory", async () => {
      const response = await ChatClient.create(chatModel)
        .prompt()
        .advisors(
          new ToolCallAdvisor({ conversationHistoryEnabled: false }),
          new MessageChatMemoryAdvisor({
            chatMemory: new MessageWindowChatMemory({
              chatMemoryRepository: new InMemoryChatMemoryRepository(),
              maxMessages: 500,
            }),
          }),
        )
        .user((u) =>
          u.text(
            "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
          ),
        )
        .toolCallbacks(createWeatherToolCallback())
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("call default advisor configuration", async () => {
      const chatClient = ChatClient.builder(chatModel)
        .defaultAdvisors(new ToolCallAdvisor())
        .build();

      const response = await chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("call default advisor configuration with external memory", async () => {
      const chatClient = ChatClient.builder(chatModel)
        .defaultAdvisors(
          new ToolCallAdvisor({ conversationHistoryEnabled: false }),
          new MessageChatMemoryAdvisor({
            chatMemory: new MessageWindowChatMemory({
              chatMemoryRepository: new InMemoryChatMemoryRepository(),
            }),
          }),
        )
        .build();

      const response = await chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("call with return direct", async () => {
      const response = await ChatClient.create(chatModel)
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user("What's the weather like in Tokyo?")
        .toolCallbacks(createReturnDirectWeatherToolCallback())
        .call()
        .content();

      logger.info("Response: %s", response);

      // With returnDirect=true, the raw tool result is returned without LLM
      // processing
      expect(response).toContain("temp");
    });
  });

  describe("StreamTests", () => {
    it("stream multiple tool invocations", async () => {
      const response = ChatClient.create(chatModel)
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .stream()
        .content();

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      expect(content).toContain("30");
      expect(content).toContain("10");
      expect(content).toContain("15");
    });

    it("stream multiple tool invocations with external memory", async () => {
      const response = ChatClient.create(chatModel)
        .prompt()
        .advisors(
          new ToolCallAdvisor({ conversationHistoryEnabled: false }),
          new MessageChatMemoryAdvisor({
            chatMemory: new MessageWindowChatMemory({
              chatMemoryRepository: new InMemoryChatMemoryRepository(),
              maxMessages: 500,
            }),
          }),
        )
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .stream()
        .content();

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      expect(content).toContain("30");
      expect(content).toContain("10");
      expect(content).toContain("15");
    });

    it("stream default advisor configuration", async () => {
      const chatClient = ChatClient.builder(chatModel)
        .defaultAdvisors(new ToolCallAdvisor())
        .build();

      const response = chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .stream()
        .content();

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      expect(content).toContain("30");
      expect(content).toContain("10");
      expect(content).toContain("15");
    });

    it("stream default advisor configuration with external memory", async () => {
      const chatClient = ChatClient.builder(chatModel)
        .defaultAdvisors(
          new ToolCallAdvisor({ conversationHistoryEnabled: false }),
          new MessageChatMemoryAdvisor({
            chatMemory: new MessageWindowChatMemory({
              chatMemoryRepository: new InMemoryChatMemoryRepository(),
            }),
          }),
        )
        .build();

      const response = chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(createWeatherToolCallback())
        .stream()
        .content();

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      expect(content).toContain("30");
      expect(content).toContain("10");
      expect(content).toContain("15");
    });

    it("stream with return direct", async () => {
      const response = ChatClient.create(chatModel)
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user("What's the weather like in Tokyo?")
        .toolCallbacks(createReturnDirectWeatherToolCallback())
        .stream()
        .content();

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      // With returnDirect=true, the raw tool result is returned without LLM
      // processing
      expect(content).toContain("temp");
    });
  });
});
