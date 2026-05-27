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
  FunctionToolCallback,
  type ChatModel,
  type ChatResponse,
  Prompt,
  UserMessage,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { LoggerFactory } from "@nestjs-port/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lastValueFrom, type Observable, tap } from "rxjs";
import { z } from "zod";

import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";
import {
  MockWeatherService,
  type MockWeatherRequest,
  type MockWeatherResponse,
} from "../api/__tests__/tool/mock-weather-service.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_2_5_3B.name;

const MockWeatherRequestInputType = z
  .object({
    location: z.string().describe("The city and state e.g. San Francisco, CA"),
    unit: z.enum(["C", "F"]).describe("Temperature unit"),
  })
  .describe("Weather API request");

type WeatherToolRequest = MockWeatherRequest & Record<string, unknown>;

describe.skipIf(!OLLAMA_TESTS_ENABLED)(
  "OllamaChatModelFunctionCallingIT",
  () => {
    const logger = LoggerFactory.getLogger("OllamaChatModelFunctionCallingIT");
    let context: OllamaTestContext;
    let chatModel: ChatModel;

    beforeAll(async () => {
      context = await OllamaTestContext.initializeOllama([MODEL]);
      chatModel = new OllamaChatModel({
        ollamaApi: context.api,
        defaultOptions: OllamaChatOptions.builder()
          .model(MODEL)
          .temperature(0.9)
          .build(),
        retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
      });
    }, TEST_TIMEOUT);

    afterAll(async () => {
      await context?.stop();
    }, TEST_TIMEOUT);

    it(
      "function call test",
      async () => {
        const userMessage = new UserMessage({
          content:
            "What are the weather conditions in San Francisco, Tokyo, and Paris? Find the temperature in Celsius for each of the three locations.",
        });

        const messages = [userMessage];

        const promptOptions = OllamaChatOptions.builder()
          .model(MODEL)
          .toolCallbacks([createWeatherToolCallback()])
          .build();

        const response = await chatModel.call(
          new Prompt(messages, promptOptions),
        );

        logger.info(`Response: ${String(response)}`);

        expect(response.result?.output.text).toContain("30");
        expect(response.result?.output.text).toContain("10");
        expect(response.result?.output.text).toContain("15");
      },
      TEST_TIMEOUT,
    );

    it(
      "stream function call test",
      async () => {
        const userMessage = new UserMessage({
          content:
            "What are the weather conditions in San Francisco, Tokyo, and Paris? Find the temperature in Celsius for each of the three locations.",
        });

        const messages = [userMessage];

        const promptOptions = OllamaChatOptions.builder()
          .model(MODEL)
          .toolCallbacks([createWeatherToolCallback()])
          .build();

        const response = chatModel.stream(new Prompt(messages, promptOptions));

        const content = await collectChatResponseText(response);
        logger.info(`Response: ${content}`);

        expect(content).toContain("30");
        expect(content).toContain("10");
        expect(content).toContain("15");
      },
      TEST_TIMEOUT,
    );
  },
);

function createWeatherToolCallback() {
  const weatherService = new MockWeatherService();
  return FunctionToolCallback.builder<WeatherToolRequest, MockWeatherResponse>(
    "getCurrentWeather",
    (request) => weatherService.apply(request),
  )
    .description(
      "Find the weather conditions, forecasts, and temperatures for a location, like a city or state.",
    )
    .inputType(MockWeatherRequestInputType)
    .build();
}

async function collectChatResponseText(
  stream: Observable<ChatResponse>,
): Promise<string> {
  let content = "";
  await lastValueFrom(
    stream.pipe(
      tap((chatResponse) => {
        content += chatResponse.results
          .map((generation) => generation.output.text)
          .join("");
      }),
    ),
  );
  return content;
}
