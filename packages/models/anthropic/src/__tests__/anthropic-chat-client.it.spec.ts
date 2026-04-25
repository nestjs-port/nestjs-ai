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

import "reflect-metadata";

import { readFileSync } from "node:fs";
import {
  AdvisorParams,
  ChatClient,
  SimpleLoggerAdvisor,
} from "@nestjs-ai/client-chat";
import { MediaFormat } from "@nestjs-ai/commons";
import {
  type ChatResponse,
  FunctionToolCallback,
  ListOutputConverter,
  MapOutputConverter,
  JsonSchemaOutputConverter,
  Tool,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { firstValueFrom, map, type Observable, toArray } from "rxjs";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { AnthropicChatModel, AnthropicChatOptions } from "../index.js";
import {
  MockWeatherService,
  type WeatherRequest,
  WeatherRequestSchema,
  type WeatherResponse,
} from "./mock-weather-service.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicChatClientIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("AnthropicChatClientIT");
  const systemTextResource = readFileSync(
    new URL("resources/system-message.st", import.meta.url),
  );

  let chatModel: AnthropicChatModel;

  beforeAll(() => {
    chatModel = new AnthropicChatModel();
  });

  it("call", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .system((s) =>
        s
          .text(systemTextResource)
          .param("name", "Bob")
          .param("voice", "pirate"),
      )
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();

    logger.info("%o", response);
    expect(response?.results).toHaveLength(1);
    expect(response?.results[0]?.output.text ?? "").toContain("Blackbeard");
  });

  it("list output converter string", async () => {
    const collection = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(new ListOutputConverter());

    logger.info("%s", String(collection));
    expect(collection).toHaveLength(5);
  });

  it("list output converter bean", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user(
        "Generate the filmography of 5 movies for Tom Hanks and Bill Murray.",
      )
      .call()
      .entity(z.array(ActorsFilmsSchema.transform(toActorsFilms)));

    logger.info("%o", actorsFilms);
    expect(actorsFilms).toHaveLength(2);
  });

  it("native list output converter bean", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .options(AnthropicChatOptions.builder().model("claude-sonnet-4-6"))
      .user(
        "Generate the filmography of 5 movies for Tom Hanks and Bill Murray.",
      )
      .call()
      .entity(z.array(ActorsFilmsSchema.transform(toActorsFilms)));

    logger.info("%o", actorsFilms);
    expect(actorsFilms).toHaveLength(2);
  });

  it("custom output converter", async () => {
    const toStringListConverter = new ListOutputConverter();

    const flavors = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(toStringListConverter);

    logger.info("ice cream flavors%s", String(flavors));
    expect(flavors).toHaveLength(5);
    expect(flavors).toContainEqual(expect.stringMatching(/Vanilla|vanilla/));
  });

  it("map output converter", async () => {
    const result = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u
          .text("Provide me a List of {subject}")
          .param(
            "subject",
            "an array of numbers from 1 to 9 under they key name 'numbers'",
          ),
      )
      .call()
      .entity(new MapOutputConverter());

    expect(result?.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("bean output converter", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography for a random actor.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%o", actorsFilms);
    expect(actorsFilms?.actor ?? "").not.toBe("");
  });

  it("bean output converter records", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography of 5 movies for Tom Hanks.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%o", actorsFilms);
    expect(actorsFilms?.actor).toBe("Tom Hanks");
    expect(actorsFilms?.movies).toHaveLength(5);
  });

  it("bean stream output converter records", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const chatResponse = ChatClient.create(chatModel)
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .user((u) =>
        u
          .text(
            "Generate the filmography of 5 movies for Tom Hanks. " +
              "\n" +
              "{format}",
          )
          .param("format", outputConverter.format),
      )
      .stream()
      .content();

    const generationTextFromStream = await collectText(chatResponse);

    const actorsFilms = await outputConverter.convert(generationTextFromStream);

    logger.info("%o", actorsFilms);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("function call test", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .user(
        "What's the weather like in San Francisco (California, USA), Tokyo (Japan), and Paris (France)? Use Celsius.",
      )
      .toolCallbacks(createWeatherToolCallback("getCurrentWeather", true))
      .call()
      .content();

    logger.info("Response: %s", response);
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("function call with generated description", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .user(
        "What's the weather like in San Francisco, Tokyo, and Paris? Use Celsius.",
      )
      .toolCallbacks(
        createWeatherToolCallback("getCurrentWeatherInLocation", false),
      )
      .call()
      .content();

    logger.info("Response: %s", response);
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("default function call test", async () => {
    const response = await ChatClient.builder(chatModel)
      .defaultToolCallbacks(
        createWeatherToolCallback("getCurrentWeather", true),
      )
      .defaultUser((u) =>
        u.text(
          "What's the weather like in San Francisco, Tokyo, and Paris? Use Celsius.",
        ),
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

  it("stream function call test", async () => {
    const response = ChatClient.create(chatModel)
      .prompt()
      .user(
        "What's the weather like in San Francisco, Tokyo, and Paris? Use Celsius.",
      )
      .toolCallbacks(createWeatherToolCallback("getCurrentWeather", true))
      .stream()
      .content();

    const content = await collectText(response);
    logger.info("Response: %s", content);
    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it("multi modality embedded image", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(AnthropicChatOptions.builder().model("claude-haiku-4-5"))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(
            MediaFormat.IMAGE_PNG,
            readFileSync(new URL("resources/test.png", import.meta.url)),
          ),
      )
      .call()
      .content();

    logger.info("%s", response);
    expect(response ?? "").toMatch(/bananas|apple|bowl|basket|fruit stand/);
  });

  it("multi modality image url", async () => {
    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(AnthropicChatOptions.builder().model("claude-haiku-4-5"))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(MediaFormat.IMAGE_PNG, url),
      )
      .call()
      .content();

    logger.info("%s", response);
    expect(response ?? "").toMatch(/bananas|apple|bowl|basket|fruit stand/);
  });

  it("streaming multi modality", async () => {
    const response = ChatClient.create(chatModel)
      .prompt()
      .options(AnthropicChatOptions.builder().model("claude-haiku-4-5"))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(
            MediaFormat.IMAGE_PNG,
            readFileSync(new URL("resources/test.png", import.meta.url)),
          ),
      )
      .stream()
      .content();

    const content = await collectText(response);
    logger.info("Response: %s", content);
    expect(content).toMatch(/bananas|apple|bowl|basket|fruit stand/);
  });

  it("stream tool calling response should not contain tool call messages", async () => {
    const chatClient = ChatClient.builder(chatModel).build();

    const responses = chatClient
      .prompt()
      .options(AnthropicChatOptions.builder().model("claude-haiku-4-5"))
      .tools(new MyTools())
      .user("Get current weather in Amsterdam and Paris")
      .stream()
      .chatResponse();

    const chatResponses = await collectChatResponses(responses);

    expect(chatResponses).not.toHaveLength(0);

    chatResponses.forEach((chatResponse) => {
      logger.info("ChatResponse Results: %o", chatResponse.results);
      expect(chatResponse.hasToolCalls()).toBe(false);
    });
  });
});

class MyTools {
  @Tool({
    description: "Get the current weather forecast by city name",
    parameters: z.object({
      cityName: z.string().describe("The city name"),
    }),
    returns: z.string(),
  })
  getCurrentDateTime(input: { cityName: string }): string {
    return `For ${input.cityName} Weather is hot and sunny with a temperature of 20 degrees`;
  }
}

const ActorsFilmsSchema = z.object({
  actor: z.string(),
  movies: z.array(z.string()),
});

const ActorsFilmsJsonSchema = {
  type: "object",
  properties: {
    actor: { type: "string" },
    movies: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["actor", "movies"],
  additionalProperties: false,
  $schema: "https://json-schema.org/draft/2020-12/schema",
} as const;

class ActorsFilms {
  actor = "";

  movies: string[] = [];
}

function toActorsFilms(value: {
  actor: string;
  movies: string[];
}): ActorsFilms {
  return Object.assign(new ActorsFilms(), value);
}

function createWeatherToolCallback(name: string, includeDescription: boolean) {
  const weatherService = new MockWeatherService();
  const builder = FunctionToolCallback.builder<WeatherRequest, WeatherResponse>(
    name,
    (input) => weatherService.apply(input),
  ).inputType(WeatherRequestSchema);

  if (includeDescription) {
    builder.description("Get the weather in location");
  }

  return builder.build();
}

async function collectText(stream: Observable<string>): Promise<string> {
  return await firstValueFrom(
    stream.pipe(
      toArray(),
      map((parts) => parts.join("")),
    ),
  );
}

async function collectChatResponses(
  responses: Observable<ChatResponse>,
): Promise<ChatResponse[]> {
  return await firstValueFrom(responses.pipe(toArray()));
}
