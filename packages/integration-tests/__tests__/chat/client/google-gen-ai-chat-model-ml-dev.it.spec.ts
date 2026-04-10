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

import { GoogleGenAI } from "@google/genai";
import { FunctionToolCallback, Prompt, UserMessage } from "@nestjs-ai/model";
import {
  GoogleGenAiChatModel,
  GoogleGenAiChatOptions,
} from "@nestjs-ai/model-google-genai";
import { beforeAll, describe, expect, it } from "vitest";
import {
  MockWeatherService,
  WeatherRequestSchema,
} from "./advisor/mock-weather-service";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

describe.skipIf(!GOOGLE_API_KEY)("GoogleGenAiChatModelMLDevIT", () => {
  let genAiClient: GoogleGenAI;

  const weatherService = new MockWeatherService();

  beforeAll(() => {
    genAiClient = new GoogleGenAI({
      apiKey: GOOGLE_API_KEY ?? "",
    });
  });

  function createChatModel(
    defaultOptions?: GoogleGenAiChatOptions,
  ): GoogleGenAiChatModel {
    return new GoogleGenAiChatModel({
      genAiClient,
      defaultOptions:
        defaultOptions ??
        new GoogleGenAiChatOptions({
          model: GoogleGenAiChatModel.ChatModel.GEMINI_3_FLASH_PREVIEW,
        }),
    });
  }

  function createWeatherToolCallback() {
    return FunctionToolCallback.builder(
      "get_current_weather",
      (input: Parameters<MockWeatherService["apply"]>[0]) =>
        weatherService.apply(input),
    )
      .description("Get the current weather in a given location")
      .inputType(WeatherRequestSchema)
      .build();
  }

  it("google search with server side tool invocations", async () => {
    const chatModel = createChatModel(
      new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_2_0_FLASH,
        googleSearchRetrieval: true,
        includeServerSideToolInvocations: false,
      }),
    );

    const response = await chatModel.call(
      new Prompt(
        new UserMessage({
          content:
            "What are the top 3 most famous pirates in history? Use Google Search.",
        }),
      ),
    );

    expect(response.result?.output.text ?? "").toMatch(/\S/);
  });

  it("google search with server side tool invocations gemini 3x", async () => {
    const chatModel = createChatModel(
      new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW,
        googleSearchRetrieval: true,
        includeServerSideToolInvocations: true,
      }),
    );

    const response = await chatModel.call(
      new Prompt(
        new UserMessage({
          content:
            "What are the top 3 most famous pirates in history? Use Google Search.",
        }),
      ),
    );

    expect(response.result?.output.text ?? "").toMatch(/\S/);
    const metadata = response.result?.output.metadata as Record<
      string,
      unknown
    >;
    expect(metadata).toHaveProperty("serverSideToolInvocations");

    const invocations = metadata.serverSideToolInvocations as Array<
      Record<string, unknown>
    >;
    expect(invocations.length).toBeGreaterThan(0);
    expect(invocations.some((inv) => inv.type === "toolCall")).toBe(true);
    expect(invocations.some((inv) => inv.type === "toolResponse")).toBe(true);
  });

  it("function calling with google search and server side tool invocations", async () => {
    const chatModel = createChatModel(
      new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_2_5_FLASH,
        googleSearchRetrieval: false,
        includeServerSideToolInvocations: false,
        toolCallbacks: [createWeatherToolCallback()],
      }),
    );

    const response = await chatModel.call(
      new Prompt(
        new UserMessage({
          content:
            "What's the weather like in San Francisco? Return the temperature in Celsius. Also, search online for the latest news about San Francisco.",
        }),
      ),
    );

    expect(response.result?.output.text ?? "").toContain("30");
    expect(response.result?.output.text ?? "").toMatch(/\S/);
  });

  it("function calling with google search and server side tool invocations gemini 3x", async () => {
    const chatModel = createChatModel(
      new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_3_FLASH_PREVIEW,
        googleSearchRetrieval: true,
        includeServerSideToolInvocations: true,
        toolCallbacks: [createWeatherToolCallback()],
      }),
    );

    const response = await chatModel.call(
      new Prompt(
        new UserMessage({
          content:
            "What's the weather like in San Francisco? Return the temperature in Celsius. Also, search online for the latest news about San Francisco.",
        }),
      ),
    );

    expect(response.result?.output.text ?? "").toContain("30");
    expect(response.result?.output.text ?? "").toMatch(/\S/);
  });
});
