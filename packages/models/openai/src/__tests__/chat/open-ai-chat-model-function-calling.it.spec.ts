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

import { ChatClient } from "@nestjs-ai/client-chat";
import {
  FunctionToolCallback,
  Prompt,
  type ToolContext,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory } from "@nestjs-port/core";
import { lastValueFrom, type Observable, tap } from "rxjs";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  type MockWeatherResponse,
  MockWeatherService,
} from "./mock-weather-service.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModelFunctionCallingIT", () => {
  const logger = LoggerFactory.getLogger("OpenAiChatModelFunctionCallingIT");

  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  async function functionCallTest(
    promptOptions: OpenAiChatOptions,
  ): Promise<void> {
    const userMessage = new UserMessage({
      content: "What's the weather like in San Francisco, Tokyo, and Paris?",
    });

    const messages = [userMessage];

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info("Response: %o", response);

    const text = response.result?.output.text ?? "";
    expect(text).toContain("30");
    expect(text).toContain("10");
    expect(text).toContain("15");
  }

  async function streamFunctionCallTest(
    promptOptions: OpenAiChatOptions,
  ): Promise<void> {
    const userMessage = new UserMessage({
      content: "What's the weather like in San Francisco, Tokyo, and Paris?",
    });

    const messages = [userMessage];

    const response = chatModel.stream(new Prompt(messages, promptOptions));

    const content = await collectChatResponseText(response);
    logger.info("Response: %s", content);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  }

  it("function call supplier", async () => {
    const state: Record<string, unknown> = {};

    // @formatter:off
    const response = await ChatClient.create(chatModel)
      .prompt()
      .user("Turn the light on in the living room")
      .toolCallbacks(
        FunctionToolCallback.builder("turnsLightOnInTheLivingRoom", () => {
          state.Light = "ON";
        }).build(),
      )
      .call()
      .content();
    // @formatter:on

    logger.info("Response: %s", response);
    expect(state).toHaveProperty("Light", "ON");
  });

  it("function call test", async () => {
    const weatherService = new MockWeatherService();
    await functionCallTest(
      OpenAiChatOptions.builder()
        .model("gpt-4o")
        .toolCallbacks([
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) => weatherService.apply(request),
          )
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        ])
        .build(),
    );
  });

  it("function call with tool context test", async () => {
    const biFunction = (
      request: MockWeatherRequest,
      toolContext: ToolContext | null,
    ): MockWeatherResponse => {
      expect(toolContext?.context).toHaveProperty("sessionId", "123");

      let temperature = 0;
      if (request.location.includes("Paris")) {
        temperature = 15;
      } else if (request.location.includes("Tokyo")) {
        temperature = 10;
      } else if (request.location.includes("San Francisco")) {
        temperature = 30;
      }

      return {
        temp: temperature,
        feels_like: 15,
        temp_min: 20,
        temp_max: 2,
        pressure: 53,
        humidity: 45,
        unit: "C",
      };
    };

    await functionCallTest(
      OpenAiChatOptions.builder()
        .model("gpt-4o")
        .toolCallbacks([
          FunctionToolCallback.builder("getCurrentWeather", biFunction)
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        ])
        .toolContext({ sessionId: "123" })
        .build(),
    );
  });

  it("stream function call test", async () => {
    const weatherService = new MockWeatherService();
    await streamFunctionCallTest(
      OpenAiChatOptions.builder()
        .toolCallbacks([
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) => weatherService.apply(request),
          )
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            // .responseConverter(response -> "" + response.temp() + response.unit())
            .build(),
        ])
        .build(),
    );
  });

  it("stream function call with tool context test", async () => {
    const biFunction = (
      request: MockWeatherRequest,
      toolContext: ToolContext | null,
    ): MockWeatherResponse => {
      expect(toolContext?.context).toHaveProperty("sessionId", "123");

      let temperature = 0;
      if (request.location.includes("Paris")) {
        temperature = 15;
      } else if (request.location.includes("Tokyo")) {
        temperature = 10;
      } else if (request.location.includes("San Francisco")) {
        temperature = 30;
      }

      return {
        temp: temperature,
        feels_like: 15,
        temp_min: 20,
        temp_max: 2,
        pressure: 53,
        humidity: 45,
        unit: "C",
      };
    };

    const promptOptions = OpenAiChatOptions.builder()
      .toolCallbacks([
        FunctionToolCallback.builder("getCurrentWeather", biFunction)
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      ])
      .toolContext({ sessionId: "123" })
      .build();

    await streamFunctionCallTest(promptOptions);
  });
});

async function collectChatResponseText(
  stream: Observable<{
    results: Array<{ output: { text: string | null } }>;
  }>,
): Promise<string> {
  let answer = "";
  await lastValueFrom(
    stream.pipe(
      tap((chatResponse) => {
        if (chatResponse.results.length > 0) {
          answer += chatResponse.results[0]?.output.text ?? "";
        }
      }),
    ),
  );
  return answer;
}
