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

import {
  ChatClient,
  MessageChatMemoryAdvisor,
  ToolCallAdvisor,
} from "@nestjs-ai/client-chat";
import { LoggerFactory } from "@nestjs-ai/commons";
import {
  type ChatModel,
  FunctionToolCallback,
  InMemoryChatMemoryRepository,
  MessageWindowChatMemory,
  ToolMetadata,
} from "@nestjs-ai/model";
import { firstValueFrom } from "rxjs";
import { toArray as toArrayOperator } from "rxjs/operators";
import { expect } from "vitest";
import {
  MockWeatherService,
  type WeatherRequest,
  WeatherRequestSchema,
  type WeatherResponse,
} from "./mock-weather-service";

/**
 * Abstract base suite for tool call advisor integration tests.
 * Contains common test logic to avoid duplication between advisor implementations.
 */
export abstract class AbstractToolCallAdvisorIT {
  protected readonly logger = LoggerFactory.getLogger(
    AbstractToolCallAdvisorIT.name,
  );

  private readonly weatherService = new MockWeatherService();

  protected abstract getChatModel(): ChatModel;

  protected createWeatherToolCallback(): FunctionToolCallback<
    WeatherRequest,
    WeatherResponse
  > {
    return FunctionToolCallback.builder<WeatherRequest, WeatherResponse>(
      "getCurrentWeather",
      (request) => this.weatherService.apply(request),
    )
      .description("Get the weather in location")
      .inputType(WeatherRequestSchema)
      .build();
  }

  protected createReturnDirectWeatherToolCallback(): FunctionToolCallback<
    WeatherRequest,
    WeatherResponse
  > {
    return FunctionToolCallback.builder<WeatherRequest, WeatherResponse>(
      "getCurrentWeather",
      (request) => this.weatherService.apply(request),
    )
      .description("Get the weather in location")
      .inputType(WeatherRequestSchema)
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .build();
  }

  protected async testCallMultipleToolInvocations(): Promise<void> {
    const response = await ChatClient.create(this.getChatModel())
      .prompt()
      .advisors(new ToolCallAdvisor())
      .user((user) =>
        user.text(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        ),
      )
      .toolCallbacks(this.createWeatherToolCallback())
      .call()
      .content();

    this.logger.info(`Response: ${response}`);

    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  }

  protected async testCallMultipleToolInvocationsWithExternalMemory(): Promise<void> {
    const response = await ChatClient.create(this.getChatModel())
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
      .user((user) =>
        user.text(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        ),
      )
      .toolCallbacks(this.createWeatherToolCallback())
      .call()
      .content();

    this.logger.info(`Response: ${response}`);

    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  }

  protected async testCallDefaultAdvisorConfiguration(): Promise<void> {
    const chatClient = ChatClient.builder(this.getChatModel())
      .defaultAdvisors(new ToolCallAdvisor())
      .build();

    const response = await chatClient
      .prompt()
      .user(
        "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
      )
      .toolCallbacks(this.createWeatherToolCallback())
      .call()
      .content();

    this.logger.info(`Response: ${response}`);

    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  }

  protected async testCallDefaultAdvisorConfigurationWithExternalMemory(): Promise<void> {
    const chatClient = ChatClient.builder(this.getChatModel())
      .defaultAdvisors(
        new ToolCallAdvisor({ conversationHistoryEnabled: false }),
        new MessageChatMemoryAdvisor({
          chatMemory: new MessageWindowChatMemory({
            chatMemoryRepository: new InMemoryChatMemoryRepository(),
            maxMessages: 500,
          }),
        }),
      )
      .build();

    const response = await chatClient
      .prompt()
      .user(
        "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
      )
      .toolCallbacks(this.createWeatherToolCallback())
      .call()
      .content();

    this.logger.info(`Response: ${response}`);

    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  }

  protected async testCallWithReturnDirect(): Promise<void> {
    const response = await ChatClient.create(this.getChatModel())
      .prompt()
      .advisors(new ToolCallAdvisor())
      .user("What's the weather like in Tokyo?")
      .toolCallbacks(this.createReturnDirectWeatherToolCallback())
      .call()
      .content();

    this.logger.info(`Response: ${response}`);

    expect(response).toContain("temp");
  }

  protected async testStreamMultipleToolInvocations(): Promise<void> {
    const chunks = await firstValueFrom(
      ChatClient.create(this.getChatModel())
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(this.createWeatherToolCallback())
        .stream()
        .content()
        .pipe(toArrayOperator()),
    );
    const content = chunks.join("");

    this.logger.info(`Response: ${content}`);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  }

  protected async testStreamMultipleToolInvocationsWithExternalMemory(): Promise<void> {
    const chunks = await firstValueFrom(
      ChatClient.create(this.getChatModel())
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
        .toolCallbacks(this.createWeatherToolCallback())
        .stream()
        .content()
        .pipe(toArrayOperator()),
    );
    const content = chunks.join("");

    this.logger.info(`Response: ${content}`);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  }

  protected async testStreamDefaultAdvisorConfiguration(): Promise<void> {
    const chatClient = ChatClient.builder(this.getChatModel())
      .defaultAdvisors(new ToolCallAdvisor())
      .build();

    const chunks = await firstValueFrom(
      chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(this.createWeatherToolCallback())
        .stream()
        .content()
        .pipe(toArrayOperator()),
    );
    const content = chunks.join("");

    this.logger.info(`Response: ${content}`);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  }

  protected async testStreamDefaultAdvisorConfigurationWithExternalMemory(): Promise<void> {
    const chatClient = ChatClient.builder(this.getChatModel())
      .defaultAdvisors(
        new ToolCallAdvisor({ conversationHistoryEnabled: false }),
        new MessageChatMemoryAdvisor({
          chatMemory: new MessageWindowChatMemory({
            chatMemoryRepository: new InMemoryChatMemoryRepository(),
            maxMessages: 500,
          }),
        }),
      )
      .build();

    const chunks = await firstValueFrom(
      chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        )
        .toolCallbacks(this.createWeatherToolCallback())
        .stream()
        .content()
        .pipe(toArrayOperator()),
    );
    const content = chunks.join("");

    this.logger.info(`Response: ${content}`);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  }

  protected async testStreamWithReturnDirect(): Promise<void> {
    const chunks = await firstValueFrom(
      ChatClient.create(this.getChatModel())
        .prompt()
        .advisors(new ToolCallAdvisor())
        .user("What's the weather like in Tokyo?")
        .toolCallbacks(this.createReturnDirectWeatherToolCallback())
        .stream()
        .content()
        .pipe(toArrayOperator()),
    );
    const content = chunks.join("");

    this.logger.info(`Response: ${content}`);

    expect(content).toContain("temp");
  }
}
