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
import { ChatClient } from "@nestjs-ai/client-chat";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  FunctionToolCallback,
  JsonSchemaOutputConverter,
  ListOutputConverter,
  type Message,
  Prompt,
  PromptTemplate,
  SystemPromptTemplate,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, toArray } from "rxjs";
import { assert, beforeEach, describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../../open-ai-chat-options.js";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "../mock-weather-service.js";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
const OLLAMA_WITH_OPENAI_TESTS = process.env.OLLAMA_WITH_OPENAI_TESTS;

const DEFAULT_OLLAMA_MODEL = "qwen2.5:3b";
const MULTIMODAL_MODEL = "gemma3:4b";

describe.skipIf(!OLLAMA_WITH_OPENAI_TESTS)(
  "OllamaWithOpenAiChatModelIT",
  () => {
    LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
    const logger = LoggerFactory.getLogger("OllamaWithOpenAiChatModelIT");
    let chatModel: OpenAiChatModel;

    const systemPromptResource = readFileSync(
      new URL("../system-message.st", import.meta.url),
    );

    beforeEach(() => {
      chatModel = new OpenAiChatModel({
        options: OpenAiChatOptions.builder()
          .baseUrl(OLLAMA_BASE_URL)
          .model(DEFAULT_OLLAMA_MODEL)
          .build(),
      });
    });

    it("role test", async () => {
      const userMessage = new UserMessage({
        content: "What's the capital of Denmark?",
      });
      const systemPromptTemplate = new SystemPromptTemplate(
        systemPromptResource,
      );
      const systemMessage = systemPromptTemplate.createMessage({
        name: "Bob",
        voice: "pirate",
      });
      const prompt = new Prompt([userMessage, systemMessage]);
      const response = await chatModel.call(prompt);
      expect(response.results).toHaveLength(1);
      expect(response.results[0]?.output.text?.toLowerCase()).toContain(
        "copenhag",
      );
    });

    it("stream role test", async () => {
      const userMessage = new UserMessage({
        content: "What's the capital of Denmark?",
      });
      const systemPromptTemplate = new SystemPromptTemplate(
        systemPromptResource,
      );
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

      expect(stitchedResponseContent.toLowerCase()).toContain("copenhag");
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

      const list = await outputConverter.convert(generation.output.text ?? "");
      expect(list).toHaveLength(5);
    });

    it("bean output converter records", async () => {
      const outputConverter = new JsonSchemaOutputConverter({
        schema: ActorsFilmsSchema,
      });

      const format = outputConverter.format;
      const template = `
				Generate the filmography of 5 movies for Tom Hanks.
				{format}
				Return ONLY the JSON without any markdown formatting or comments.
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

      const actorsFilms = await outputConverter.convert(
        generation.output.text ?? "",
      );
      logger.info("%o", actorsFilms);
      expect(actorsFilms.actor).toBe("Tom Hanks");
      expect(actorsFilms.movies).toHaveLength(5);
    });

    it("function call test", async () => {
      const userMessage = new UserMessage({
        content:
          "What are the weather conditions in San Francisco, Tokyo, and Paris? Find the temperature in Celsius for each of the three locations.",
      });

      const messages: Message[] = [userMessage];

      const weatherService = new MockWeatherService();
      const promptOptions = OpenAiChatOptions.builder()
        .model(DEFAULT_OLLAMA_MODEL)
        .toolCallbacks([
          FunctionToolCallback.builder(
            "getCurrentWeather",
            (request: MockWeatherRequest) => weatherService.apply(request),
          )
            .description(
              "Find the weather conditions, forecasts, and temperatures for a location, like a city or state.",
            )
            .inputType(MockWeatherRequestInputType)
            .build(),
        ])
        .build();

      const response = await chatModel.call(
        new Prompt(messages, promptOptions),
      );

      logger.info("Response: %o", response);

      expect(response.result?.output.text).toContain("30");
      expect(response.result?.output.text).toContain("10");
      expect(response.result?.output.text).toContain("15");
    });

    it("multi modality embedded image", async () => {
      const imageData = readFileSync(new URL("../test.png", import.meta.url));

      const userMessage = new UserMessage({
        content: "Explain what do you see on this picture?",
        media: [
          new Media({ mimeType: MediaFormat.IMAGE_PNG, data: imageData }),
        ],
      });

      const response = await chatModel.call(
        new Prompt(
          [userMessage],
          OpenAiChatOptions.builder().model(MULTIMODAL_MODEL).build(),
        ),
      );

      logger.info("%s", response.result?.output.text ?? "");
      expect(response.result?.output.text).toMatch(
        /bananas|apple|bowl|basket|fruit stand/,
      );
    });

    it("validate call response metadata", async () => {
      const chatClient = ChatClient.create(chatModel);
      const response = await chatClient
        .prompt()
        .options(OpenAiChatOptions.builder().model(DEFAULT_OLLAMA_MODEL))
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
        DEFAULT_OLLAMA_MODEL.toLowerCase(),
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
        .model(DEFAULT_OLLAMA_MODEL)
        .extraBody(extraBody)
        .build();

      const prompt = new Prompt("Tell me a short joke.", options);

      const response = await chatModel.call(prompt);

      assert.exists(response);
      expect(response.result?.output.text).not.toBe("");
      // Because max_tokens is 2, the finish reason should be length or similar
      // indicating truncation
      expect(response.result?.metadata.finishReason?.toLowerCase()).toContain(
        "length",
      );
    });
  },
);

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
