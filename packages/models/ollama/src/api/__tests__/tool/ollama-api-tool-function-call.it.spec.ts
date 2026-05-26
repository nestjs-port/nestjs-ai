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

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaTestContext } from "../../../__tests__/ollama-test-context.js";
import { OllamaApi } from "../../ollama-api.js";
import { OllamaModel } from "../../ollama-model.js";
import {
  MockWeatherService,
  type MockWeatherRequest,
} from "./mock-weather-service.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_2_5_3B.name;

describe("OllamaApiToolFunctionCallIT", () => {
  let context: OllamaTestContext;
  const weatherService = new MockWeatherService();

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "tool function call",
    async () => {
      const message: OllamaApi.Message = {
        role: OllamaApi.Message.Role.USER,
        content:
          "What's the weather like in San Francisco, Tokyo, and Paris? Return a list with the temperature in Celsius for each of the three locations.",
      };

      const functionTool: OllamaApi.ChatRequest.Tool = {
        type: OllamaApi.ChatRequest.Tool.Type.FUNCTION,
        function: {
          name: "getCurrentWeather",
          description:
            "Find the current weather conditions, forecasts, and temperatures for a location, like a city or state.",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state e.g. San Francisco, CA",
              },
              unit: {
                type: "string",
                enum: ["C", "F"],
              },
            },
            required: ["location", "unit"],
          },
        },
      };

      const messages: OllamaApi.Message[] = [message];
      const chatCompletion = await context.api.chat({
        model: MODEL,
        stream: false,
        messages,
        tools: [functionTool],
        options: {},
      });

      expect(chatCompletion).toBeTruthy();
      expect(chatCompletion.message).toBeTruthy();

      const responseMessage = chatCompletion.message;

      expect(responseMessage.role).toBe(OllamaApi.Message.Role.ASSISTANT);
      expect(responseMessage.tool_calls).toBeTruthy();

      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls ?? []) {
        if (toolCall.function.name === "getCurrentWeather") {
          const weatherRequest = toolCall.function
            .arguments as unknown as MockWeatherRequest;
          const weatherResponse = weatherService.apply(weatherRequest);

          messages.push({
            role: OllamaApi.Message.Role.TOOL,
            content: `${weatherResponse.temp}${weatherRequest.unit}`,
          });
        }
      }

      const chatCompletion2 = await context.api.chat({
        model: MODEL,
        stream: false,
        messages,
        tools: [],
        options: {},
      });

      expect(chatCompletion2).toBeTruthy();
      expect(chatCompletion2.message.role).toBe(
        OllamaApi.Message.Role.ASSISTANT,
      );
      expect(chatCompletion2.message.content).toContain("San Francisco");
      expect(chatCompletion2.message.content).toContain("30");
      expect(chatCompletion2.message.content).toContain("Tokyo");
      expect(chatCompletion2.message.content).toContain("10");
      expect(chatCompletion2.message.content).toContain("Paris");
      expect(chatCompletion2.message.content).toContain("15");
    },
    TEST_TIMEOUT,
  );
});
