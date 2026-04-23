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

import assert from "node:assert/strict";
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
import { lastValueFrom, type Observable, tap, toArray } from "rxjs";
import { beforeAll, describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../../open-ai-chat-options";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "../mock-weather-service";

const DEFAULT_MODEL = "ai/gemma3:4B-F16";

// @Disabled("Requires Docker Model Runner enabled. See
// https://docs.docker.com/desktop/features/model-runner/")
describe.skipIf(true)("DockerModelRunnerWithOpenAiChatModel IT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger(
    "DockerModelRunnerWithOpenAiChatModelIT",
  );

  const systemPromptResource = readFileSync(
    resolve(__dirname, "..", "system-message.st"),
  );

  const baseUrl = "http://model-runner.docker.internal/engines";

  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .baseUrl(baseUrl)
      .apiKey("test")
      .maxTokens(2048)
      .model(DEFAULT_MODEL)
      .build(),
  });

  beforeAll(async () => {
    logger.info(
      `Start pulling the '${DEFAULT_MODEL}' generative ... would take several minutes ...`,
    );

    const response = await fetch(
      "http://model-runner.docker.internal/models/create",
      {
        method: "POST",
        body: JSON.stringify({ from: DEFAULT_MODEL }),
      },
    );
    assert.equal(response.status, 200);

    logger.info(`${DEFAULT_MODEL} pulling competed!`);
  });

  it("role test", async () => {
    const userMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemPromptResource);
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
    const systemPromptTemplate = new SystemPromptTemplate(systemPromptResource);
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

  it("bean output converter", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    const format = outputConverter.format;
    const template = `
				Generate the filmography for a random actor.
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
    expect(actorsFilms.actor).not.toBe("");
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

    const generationTextFromStream = await collectChatResponseText(
      chatModel.stream(prompt),
    );

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

  // @Disabled("stream function call not supported yet")
  it.skipIf(true)("stream function call test", async () => {
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

    const content = await collectChatResponseText(response);
    logger.info("Response: %s", content);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it("validate call response metadata", async () => {
    // @formatter:off
    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(OpenAiChatOptions.builder().model(DEFAULT_MODEL))
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();
    // @formatter:on

    if (response == null) {
      throw new Error("Expected chat response to be present");
    }

    logger.info("%s", String(response));
    expect(response.metadata.id).not.toBe("");
    expect(response.metadata.model.toLowerCase()).toContain(
      DEFAULT_MODEL.toLowerCase(),
    );
    expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
    expect(response.metadata.usage.completionTokens).toBeGreaterThan(0);
    expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
  });
});

class ActorsFilms {
  actor = "";

  movies: string[] = [];

  toString(): string {
    return `ActorsFilms{actor='${this.actor}', movies=${JSON.stringify(this.movies)}}`;
  }
}

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
