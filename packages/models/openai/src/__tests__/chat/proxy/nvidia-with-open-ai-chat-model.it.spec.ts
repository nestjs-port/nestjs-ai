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
import { ChatClient } from "@nestjs-ai/client-chat";
import {
  BeanOutputConverter,
  FunctionToolCallback,
  ListOutputConverter,
  MapOutputConverter,
  Prompt,
  PromptTemplate,
  SystemPromptTemplate,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../../open-ai-chat-options.js";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "../mock-weather-service.js";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com";

const DEFAULT_NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";

describe.skipIf(!NVIDIA_API_KEY)("NvidiaWithOpenAiChatModelIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("NvidiaWithOpenAiChatModelIT");

  const systemResource = readFileSync(
    resolve(__dirname, "..", "system-message.st"),
  );

  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .baseUrl(NVIDIA_BASE_URL)
      .apiKey(NVIDIA_API_KEY ?? "")
      .maxTokens(2048)
      .model(DEFAULT_NVIDIA_MODEL)
      .build(),
  });

  it("role test", async () => {
    const userMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemResource);
    const systemMessage = systemPromptTemplate.createMessage({
      name: "Bob",
      voice: "pirate",
    });
    const prompt = new Prompt([userMessage, systemMessage]);
    const response = await chatModel.call(prompt);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.output.text).toContain("Blackbeard");
  });

  it("stream role test", async () => {
    const userMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemResource);
    const systemMessage = systemPromptTemplate.createMessage({
      name: "Bob",
      voice: "pirate",
    });
    const prompt = new Prompt([userMessage, systemMessage]);
    const responses = await lastValueFrom(
      chatModel.stream(prompt).pipe(toArray()),
    );

    expect(responses.length).toBeGreaterThan(1);

    const stitchedResponseContent = responses
      .flatMap((response) => response.results)
      .map((generation) => generation.output.text ?? "")
      .join("");

    expect(stitchedResponseContent).toContain("Blackbeard");
  });

  it("streaming with token usage", async () => {
    const promptOptions = OpenAiChatOptions.builder()
      .streamOptions({ include_usage: true })
      .seed(1)
      .build();

    const prompt = new Prompt(
      "List two colors of the Polish flag. Be brief.",
      promptOptions,
    );

    const streamingTokenUsage = (await lastValueFrom(chatModel.stream(prompt)))
      .metadata.usage;
    const referenceTokenUsage = (await chatModel.call(prompt)).metadata.usage;

    expect(streamingTokenUsage.promptTokens).toBeGreaterThan(0);
    expect(streamingTokenUsage.completionTokens).toBeGreaterThan(0);
    expect(streamingTokenUsage.totalTokens).toBeGreaterThan(0);

    expect(streamingTokenUsage.promptTokens).toBe(
      referenceTokenUsage.promptTokens,
    );
    expect(streamingTokenUsage.completionTokens).toBe(
      referenceTokenUsage.completionTokens,
    );
    expect(streamingTokenUsage.totalTokens).toBe(
      referenceTokenUsage.totalTokens,
    );
  });

  it("list output converter", async () => {
    const outputConverter = new ListOutputConverter();

    const format = outputConverter.format;
    const template = `
				List five {subject}
				{format}
				`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ subject: "ice cream flavors", format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generationResponse = await chatModel.call(prompt);
    if (generationResponse.result == null) {
      throw new Error("Expected chat generation to be present");
    }
    const generation = generationResponse.result;

    const list = outputConverter.convert(generation.output.text ?? "");
    expect(list).toHaveLength(5);
  });

  it("map output converter", async () => {
    const outputConverter = new MapOutputConverter();

    const format = outputConverter.format;
    const template = `
				Provide me a List of {subject}
				{format}
				`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({
        subject: "numbers from 1 to 9 under they key name 'numbers'",
        format,
      })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generationResponse = await chatModel.call(prompt);
    if (generationResponse.result == null) {
      throw new Error("Expected chat generation to be present");
    }
    const generation = generationResponse.result;

    const result = outputConverter.convert(generation.output.text ?? "");
    expect(result.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("bean output converter records", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilmsRecord,
    });

    const format = outputConverter.format;
    const template = `
				Generate the filmography of 5 movies for Tom Hanks.
				{format}
				`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generationResponse = await chatModel.call(prompt);
    if (generationResponse.result == null) {
      throw new Error("Expected chat generation to be present");
    }
    const generation = generationResponse.result;

    const actorsFilms = outputConverter.convert(generation.output.text ?? "");
    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean stream output converter records", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilmsRecord,
    });

    const format = outputConverter.format;
    const template = `
				Generate the filmography of 5 movies for Tom Hanks.
				{format}
				`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());

    const responses = await lastValueFrom(
      chatModel.stream(prompt).pipe(toArray()),
    );
    const generationTextFromStream = responses
      .flatMap((response) => response.results)
      .map((generation) => generation.output.text)
      .filter((c) => c != null)
      .join("");

    const actorsFilms = outputConverter.convert(generationTextFromStream);
    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("function call test", async () => {
    const userMessage = new UserMessage({
      content: "What's the weather like in San Francisco, Tokyo, and Paris?",
    });

    const messages = [userMessage];
    const weatherService = new MockWeatherService();
    const promptOptions = OpenAiChatOptions.builder()
      .toolCallbacks([
        FunctionToolCallback.builder(
          "getCurrentWeather",
          (request: MockWeatherRequest) => weatherService.apply(request),
        )
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      ])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info("Response: %o", response);

    expect(response.result?.output.text).toContain("30");
    expect(response.result?.output.text).toContain("10");
    expect(response.result?.output.text).toContain("15");
  });

  it("stream function call test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo, and Paris? Return the temperature in Celsius.",
    });

    const messages = [userMessage];
    const weatherService = new MockWeatherService();
    const promptOptions = OpenAiChatOptions.builder()
      .toolCallbacks([
        FunctionToolCallback.builder(
          "getCurrentWeather",
          (request: MockWeatherRequest) => weatherService.apply(request),
        )
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      ])
      .build();

    const response = chatModel.stream(new Prompt(messages, promptOptions));

    const responses = await lastValueFrom(response.pipe(toArray()));
    const content = responses
      .flatMap((r) => r.results)
      .map((generation) => generation.output.text ?? "")
      .join("");
    logger.info("Response: %s", content);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it("validate call response metadata", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(OpenAiChatOptions.builder().model(DEFAULT_NVIDIA_MODEL))
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();

    if (response == null) {
      throw new Error("Expected chat response to be present");
    }

    logger.info("%s", response.toString());
    expect(response.metadata.id).not.toBe("");
    expect(response.metadata.model.toLowerCase()).toContain(
      DEFAULT_NVIDIA_MODEL.toLowerCase(),
    );
    expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
    expect(response.metadata.usage.completionTokens).toBeGreaterThan(0);
    expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
  });

  it("extra body support", async () => {
    // Provide a parameter via extraBody that will predictably affect the response
    // 'max_tokens' placed in extraBody should be flattened to the root and limit the
    // response length.
    const extraBody: Record<string, unknown> = { max_tokens: 2 };

    const options = OpenAiChatOptions.builder()
      .model(DEFAULT_NVIDIA_MODEL)
      .extraBody(extraBody)
      .build();

    const prompt = new Prompt("Tell me a short joke.", options);

    const response = await chatModel.call(prompt);

    expect(response).not.toBeNull();
    expect(response.result?.output.text).not.toBe("");
    // Because max_tokens is 2, the finish reason should be length or similar
    // indicating truncation
    expect(
      (response.result?.metadata.finishReason ?? "").toLowerCase(),
    ).toContain("length");
  });
});

class ActorsFilmsRecord {
  actor = "";

  movies: string[] = [];
}

const ActorsFilmsSchema = {
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
