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
import {
  MethodToolCallback,
  type ToolContext,
  ToolContextSchema,
  ToolDefinitions,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../../open-ai-chat-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));

const logger = LoggerFactory.getLogger(
  "OpenAiChatClientMethodInvokingFunctionCallbackIT",
);

const argumentsMap = new Map<string, unknown>();

enum Unit {
  CELSIUS = "CELSIUS",
  FAHRENHEIT = "FAHRENHEIT",
}

type WeatherRequest = {
  city: string;
  unit: Unit;
};

type WeatherRequestWithContext = WeatherRequest & {
  toolContext: ToolContext;
};

type LightRequest = {
  roomName: string;
  on: boolean;
};

const weatherInputType = z.object({
  city: z.string(),
  unit: z.enum(Unit),
});

const lightInputType = z.object({
  roomName: z.string(),
  on: z.boolean(),
});

class TestFunctionClass {
  static argumentLessReturnVoid(): void {
    argumentsMap.set("method called", "argumentLessReturnVoid");
  }

  static getWeatherStatic(input: WeatherRequest): string {
    const { city, unit } = input;
    logger.info("City: %s Unit: %s", city, unit);

    argumentsMap.set("city", city);
    argumentsMap.set("unit", unit);

    let temperature = 0;
    if (city.includes("Paris")) {
      temperature = 15;
    } else if (city.includes("Tokyo")) {
      temperature = 10;
    } else if (city.includes("San Francisco")) {
      temperature = 30;
    }

    return `temperature: ${temperature} unit: ${unit}`;
  }

  getWeatherNonStatic(input: WeatherRequest): string {
    return TestFunctionClass.getWeatherStatic(input);
  }

  getWeatherWithContext(input: WeatherRequestWithContext): string {
    if (input.toolContext == null) {
      throw new Error("ToolContext is required by the method as an argument");
    }

    argumentsMap.set("tool", input.toolContext.context.tool);
    return TestFunctionClass.getWeatherStatic(input);
  }

  turnLight(input: LightRequest): void {
    const { roomName, on } = input;
    argumentsMap.set("roomName", roomName);
    argumentsMap.set("on", on);
    logger.info("Turn light in room: %s to: %s", roomName, on);
  }

  turnLivingRoomLightOn(): void {
    argumentsMap.set("turnLivingRoomLightOn", true);
  }
}

describe.skipIf(!OPENAI_API_KEY)(
  "OpenAiChatClientMethodInvokingFunctionCallbackIT",
  () => {
    const chatModel = new OpenAiChatModel({
      options: OpenAiChatOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
        .build(),
    });
    const chatClient = ChatClient.create(chatModel);
    const testFunctionClass = new TestFunctionClass();

    beforeEach(() => {
      argumentsMap.clear();
    });

    it("method get weather static", async () => {
      const response = await chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris?  Use Celsius.",
        )
        .toolCallbacks([
          MethodToolCallback.builder()
            .toolDefinition(
              ToolDefinitions.builder({
                methodName: "getWeatherStatic",
                metadata: {
                  parameters: weatherInputType,
                  returns: z.string(),
                },
              })
                .description("Get the weather in location")
                .build(),
            )
            .toolMethod(TestFunctionClass.getWeatherStatic)
            .toolInputSchema(weatherInputType)
            .build(),
        ])
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).not.toBeNull();
      if (response == null) {
        throw new Error("Expected response to be present");
      }
      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("method turn light no response", async () => {
      await chatClient
        .prompt()
        .user("Turn light on in the living room.")
        .toolCallbacks([
          MethodToolCallback.builder()
            .toolDefinition(
              ToolDefinitions.builder({
                methodName: "turnLight",
                metadata: {
                  parameters: lightInputType,
                  returns: z.void(),
                },
              })
                .description("Can turn lights on or off by room name")
                .build(),
            )
            .toolMethod(testFunctionClass.turnLight)
            .toolObject(testFunctionClass)
            .toolInputSchema(lightInputType)
            .build(),
        ])
        .call()
        .content();

      expect(argumentsMap.get("roomName")).toBe("living room");
      expect(argumentsMap.get("on")).toBe(true);
    });

    it("method get weather non static", async () => {
      const response = await chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris?  Use Celsius.",
        )
        .toolCallbacks([
          MethodToolCallback.builder()
            .toolDefinition(
              ToolDefinitions.builder({
                methodName: "getWeatherNonStatic",
                metadata: {
                  parameters: weatherInputType,
                  returns: z.string(),
                },
              })
                .description("Get the weather in location")
                .build(),
            )
            .toolMethod(testFunctionClass.getWeatherNonStatic)
            .toolObject(testFunctionClass)
            .toolInputSchema(weatherInputType)
            .build(),
        ])
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).not.toBeNull();
      if (response == null) {
        throw new Error("Expected response to be present");
      }
      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
    });

    it("method get weather tool context", async () => {
      const response = await chatClient
        .prompt()
        .user(
          "What's the weather like in San Francisco, Tokyo, and Paris?  Use Celsius.",
        )
        .toolCallbacks([
          MethodToolCallback.builder()
            .toolDefinition(
              ToolDefinitions.builder({
                methodName: "getWeatherWithContext",
                metadata: {
                  parameters: z.object({
                    city: z.string(),
                    unit: z.enum(Unit),
                    toolContext: ToolContextSchema,
                  }),
                  returns: z.string(),
                },
              })
                .description("Get the weather in location")
                .build(),
            )
            .toolMethod(testFunctionClass.getWeatherWithContext)
            .toolObject(testFunctionClass)
            .toolInputSchema(
              z.object({
                city: z.string(),
                unit: z.enum(Unit),
                toolContext: ToolContextSchema,
              }),
            )
            .build(),
        ])
        .toolContext(new Map([["tool", "value"]]))
        .call()
        .content();

      logger.info("Response: %s", response);

      expect(response).not.toBeNull();
      if (response == null) {
        throw new Error("Expected response to be present");
      }
      expect(response).toContain("30");
      expect(response).toContain("10");
      expect(response).toContain("15");
      expect(argumentsMap.get("tool")).toBe("value");
    });

    it("method get weather tool context but missing context argument", async () => {
      await expect(
        chatClient
          .prompt()
          .user(
            "What's the weather like in San Francisco, Tokyo, and Paris?  Use Celsius.",
          )
          .toolCallbacks([
            MethodToolCallback.builder()
              .toolDefinition(
                ToolDefinitions.builder({
                  methodName: "getWeatherWithContext",
                  metadata: {
                    parameters: z.object({
                      city: z.string(),
                      unit: z.enum(Unit),
                      toolContext: ToolContextSchema,
                    }),
                    returns: z.string(),
                  },
                })
                  .description("Get the weather in location")
                  .build(),
              )
              .toolMethod(testFunctionClass.getWeatherWithContext)
              .toolObject(testFunctionClass)
              .toolInputSchema(
                z.object({
                  city: z.string(),
                  unit: z.enum(Unit),
                  toolContext: ToolContextSchema,
                }),
              )
              .build(),
          ])
          .call()
          .content(),
      ).rejects.toThrow("ToolContext is required by the method as an argument");
    });

    it("method no parameters", async () => {
      await chatClient
        .prompt()
        .user("Turn light on in the living room.")
        .toolCallbacks([
          MethodToolCallback.builder()
            .toolDefinition(
              ToolDefinitions.builder({
                methodName: "turnLivingRoomLightOn",
                metadata: {
                  parameters: z.object({}),
                  returns: z.void(),
                },
              })
                .description("Can turn lights on in the Living Room")
                .build(),
            )
            .toolMethod(testFunctionClass.turnLivingRoomLightOn)
            .toolObject(testFunctionClass)
            .build(),
        ])
        .call()
        .content();

      expect(argumentsMap.get("turnLivingRoomLightOn")).toBe(true);
    });
  },
);
