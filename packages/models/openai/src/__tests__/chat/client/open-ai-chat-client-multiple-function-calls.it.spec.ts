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

import { ChatClient } from "@nestjs-ai/client-chat";
import { FunctionToolCallback, type ToolContext } from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../../open-ai-chat-options";
import {
  MockWeatherService,
  type MockWeatherRequest,
  MockWeatherRequestInputType,
} from "../mock-weather-service";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)(
  "OpenAiChatClientMultipleFunctionCallsIT",
  () => {
    LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
    const logger = LoggerFactory.getLogger(
      "OpenAiChatClientMultipleFunctionCallsIT",
    );

    const chatModel = new OpenAiChatModel({
      options: OpenAiChatOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .build(),
    });

    it("turn functions on and off test", async () => {
      const chatClientBuilder = ChatClient.builder(chatModel);

      const response = await chatClientBuilder
        .build()
        .prompt()
        .user((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(
        ["30", "10", "15"].every((value) => response?.includes(value)),
      ).toBe(false);

      const responseWithToolCallbacks = await chatClientBuilder
        .build()
        .prompt()
        .user((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .toolCallbacks(
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) =>
              new MockWeatherService().apply(request),
          )
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        )
        .call()
        .content();

      logger.info("Response: %s", responseWithToolCallbacks);

      expect(responseWithToolCallbacks).toContain("30");
      expect(responseWithToolCallbacks).toContain("10");
      expect(responseWithToolCallbacks).toContain("15");

      const responseAfterToolCallbacks = await chatClientBuilder
        .build()
        .prompt()
        .user((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .call()
        .content();

      logger.info("Response: %s", responseAfterToolCallbacks);

      expect(
        ["30", "10", "15"].every((value) => response?.includes(value)),
      ).toBe(false);
    }, 60_000);

    it("default function call test", async () => {
      const response = await ChatClient.builder(chatModel)
        .defaultToolCallbacks(
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) =>
              new MockWeatherService().apply(request),
          )
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        )
        .defaultUser((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .build()
        .prompt()
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("default function call test with tool context", async () => {
      const biFunction = (
        request: MockWeatherRequest,
        toolContext: ToolContext | null,
      ): MockWeatherResponse => {
        if (toolContext == null) {
          throw new Error("Expected tool context to be non-null");
        }

        expect(toolContext.context).toHaveProperty("sessionId", "123");

        return new MockWeatherService().apply(request);
      };

      const response = await ChatClient.builder(chatModel)
        .defaultToolCallbacks(
          FunctionToolCallback.builder("getCurrentWeather", biFunction)
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        )
        .defaultUser((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .defaultToolContext(new Map<string, unknown>([["sessionId", "123"]]))
        .build()
        .prompt()
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("function call test with tool context", async () => {
      const biFunction = (
        request: MockWeatherRequest,
        toolContext: ToolContext | null,
      ): MockWeatherResponse => {
        if (toolContext == null) {
          throw new Error("Expected tool context to be non-null");
        }

        expect(toolContext.context).toHaveProperty("sessionId", "123");

        return new MockWeatherService().apply(request);
      };

      const response = await ChatClient.builder(chatModel)
        .defaultToolCallbacks(
          FunctionToolCallback.builder("getCurrentWeather", biFunction)
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        )
        .defaultUser((u) =>
          u.text("What's the weather like in San Francisco, Tokyo, and Paris?"),
        )
        .build()
        .prompt()
        .toolContext(new Map<string, unknown>([["sessionId", "123"]]))
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("stream function call test", async () => {
      // @formatter:off
      const response = ChatClient.create(chatModel)
        .prompt()
        .user("What's the weather like in San Francisco, Tokyo, and Paris?")
        .toolCallbacks(
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) =>
              new MockWeatherService().apply(request),
          )
            .description("Get the weather in location")
            .inputType(MockWeatherRequestInputType)
            .build(),
        )
        .stream()
        .content();
      // @formatter:on

      const content = (await lastValueFrom(response.pipe(toArray()))).join("");
      logger.info("Response: %s", content);

      expect(content).toContain("30");
      expect(content).toContain("10");
      expect(content).toContain("15");
    });

    it("function call with explicit input type", async () => {
      const chatClient = ChatClient.create(chatModel);

      const myFunction = new MyFunction();

      // NOTE: Lambda functions do not retain the type information, so we need to
      // provide the input type explicitly.
      const currentTemp = createFunction(myFunction, "getCurrentTemp");

      const content = await chatClient
        .prompt()
        .user("What's the weather like in Shanghai?")
        .toolCallbacks(
          FunctionToolCallback.builder("currentTemp", currentTemp)
            .description("get current temp")
            .inputType(MyFunctionReqInputType)
            .build(),
        )
        .call()
        .content();

      expect(content).toContain("23");
    });
  },
);

const MyFunctionReqInputType = z.object({
  city: z.string(),
});

type MyFunctionReq = {
  city: string;
};

type MockWeatherResponse = ReturnType<MockWeatherService["apply"]>;

function createFunction<TInput, TResult>(
  obj: { getCurrentTemp: (req: TInput) => TResult },
  methodName: "getCurrentTemp",
): (req: TInput) => TResult {
  return (req: TInput) => {
    try {
      return obj[methodName](req);
    } catch (error) {
      throw new Error(String(error));
    }
  };
}

class MyFunction {
  getCurrentTemp(_req: MyFunctionReq): string {
    return "23";
  }
}
