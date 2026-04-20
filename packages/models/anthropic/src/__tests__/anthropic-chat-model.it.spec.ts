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
import { inspect } from "node:util";
import type {
  Model as AnthropicModel,
  OutputConfig,
  ToolChoice,
} from "@anthropic-ai/sdk/resources/messages";
import { ChatClient } from "@nestjs-ai/client-chat";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  BeanOutputConverter,
  type ChatResponse,
  FunctionToolCallback,
  type Generation,
  ListOutputConverter,
  MapOutputConverter,
  type Message,
  Prompt,
  PromptTemplate,
  SystemPromptTemplate,
  UserMessage,
} from "@nestjs-ai/model";
import { LoggerFactory } from "@nestjs-port/core";
import { firstValueFrom, type Observable, toArray } from "rxjs";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import type { AnthropicWebSearchResult } from "../index";
import {
  AnthropicChatModel,
  AnthropicChatOptions,
  AnthropicCitationDocument,
  AnthropicWebSearchTool,
  Citation,
} from "../index";
import {
  MockWeatherService,
  type WeatherRequest,
  WeatherRequestSchema,
  type WeatherResponse,
} from "./mock-weather-service";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEST_MODEL_4_20250514: AnthropicModel = "claude-sonnet-4-20250514";
const TEST_MODEL_4_6: AnthropicModel = "claude-sonnet-4-6";
const TEST_MODEL_HAIKU_4_5: AnthropicModel = "claude-haiku-4-5";

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicChatModelIT", () => {
  const logger = LoggerFactory.getLogger("AnthropicChatModelIT");
  const systemTextResource = readFileSync(
    resolve(__dirname, "resources", "system-message.st"),
    "utf8",
  );

  let chatModel: AnthropicChatModel;

  beforeAll(() => {
    chatModel = new AnthropicChatModel();
  });

  function validateChatResponseMetadata(
    response: ChatResponse,
    model: string,
  ): void {
    expect(response.metadata?.id ?? "").not.toBe("");
    expect(response.metadata?.usage?.promptTokens ?? 0).toBeGreaterThan(0);
    expect(response.metadata?.usage?.completionTokens ?? 0).toBeGreaterThan(0);
    expect(response.metadata?.usage?.totalTokens ?? 0).toBeGreaterThan(0);
    expect(response.metadata?.model ?? "").toBe(model);
  }

  it("role test", async () => {
    const userMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and why they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemTextResource);
    const systemMessage = systemPromptTemplate.createMessage({
      name: "Bob",
      voice: "pirate",
    });
    const prompt = new Prompt(
      [userMessage, systemMessage],
      AnthropicChatOptions.builder().model(TEST_MODEL_4_20250514).build(),
    );

    const response = await chatModel.call(prompt);

    expect(response.results).toHaveLength(1);
    expect(response.metadata?.usage?.completionTokens ?? 0).toBeGreaterThan(0);
    expect(response.metadata?.usage?.promptTokens ?? 0).toBeGreaterThan(0);
    expect(response.metadata?.usage?.totalTokens ?? 0).toBe(
      (response.metadata?.usage?.promptTokens ?? 0) +
        (response.metadata?.usage?.completionTokens ?? 0),
    );

    const generation = response.results[0];
    expect(generation.output.text ?? "").toContain("Blackbeard");
    expect(generation.metadata.finishReason).toBe("end_turn");
    logger.info(`Response: ${inspect(response, { depth: null })}`);
  });

  it("test message history", async () => {
    // First turn - ask about pirates
    const firstUserMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and why they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemTextResource);
    const systemMessage = systemPromptTemplate.createMessage({
      name: "Bob",
      voice: "pirate",
    });
    const prompt = new Prompt(
      [systemMessage, firstUserMessage],
      AnthropicChatOptions.builder().model(TEST_MODEL_4_20250514).build(),
    );

    let response = await chatModel.call(prompt);
    expect(response.result?.output.text ?? "").toMatch(
      /Blackbeard|Bartholomew/,
    );

    // Second turn - include the first exchange in history, then ask to repeat
    const assistantOutput = response.result?.output;
    if (!assistantOutput) {
      throw new Error("Expected assistant output in the first response");
    }
    const promptWithMessageHistory = new Prompt([
      systemMessage,
      firstUserMessage,
      assistantOutput,
      new UserMessage({
        content: "Repeat the names of the pirates you mentioned.",
      }),
    ]);
    response = await chatModel.call(promptWithMessageHistory);

    expect(response.result?.output.text ?? "").toMatch(
      /Blackbeard|Bartholomew/,
    );
  });

  it("list output converter", async () => {
    const listOutputConverter = new ListOutputConverter();

    const format = listOutputConverter.format;
    const template = `
List five {subject}
{format}
`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ subject: "ice cream flavors", format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generation = (await chatModel.call(prompt)).result;

    const list = listOutputConverter.convert(generation?.output.text ?? "");
    expect(list).toHaveLength(5);
  });

  it("map output converter", async () => {
    const mapOutputConverter = new MapOutputConverter();

    const format = mapOutputConverter.format;
    const template = `
Provide me a List of {subject}
{format}
`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({
        subject:
          "an array of numbers from 1 to 9 under they key name 'numbers'",
        format,
      })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generation = (await chatModel.call(prompt)).result;

    const result = mapOutputConverter.convert(generation?.output.text ?? "");
    expect(result?.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("bean output converter records", async () => {
    const beanOutputConverter = new BeanOutputConverter({
      schema: ActorsFilmsRecordSchema,
      outputType: ActorsFilmsRecord,
    });

    const format = beanOutputConverter.format;
    const template = `
Generate the filmography of 5 movies for Tom Hanks.
{format}
`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());
    const generation = (await chatModel.call(prompt)).result;

    const actorsFilms = beanOutputConverter.convert(
      generation?.output.text ?? "",
    );
    logger.info(`Actors films: ${inspect(actorsFilms, { depth: null })}`);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("validate call response metadata", async () => {
    const model = TEST_MODEL_4_20250514;
    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(AnthropicChatOptions.builder().model(model))
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();

    logger.info(`Response: ${inspect(response, { depth: null })}`);
    validateChatResponseMetadata(response as ChatResponse, model);
  });

  it("streaming basic test", async () => {
    const prompt = new Prompt("Tell me a short joke about programming.");

    const responses = await collectResponses(chatModel.stream(prompt));
    expect(responses).not.toHaveLength(0);

    // Concatenate all text from streaming responses
    const fullResponse = responses
      .flatMap((response) =>
        response.results
          .map((generation) => generation.output.text)
          .filter((text): text is string => text != null),
      )
      .join("");

    expect(fullResponse).not.toBe("");
    logger.info(`Streaming response: ${fullResponse}`);
  });

  it("streaming with token usage", async () => {
    const prompt = new Prompt("Tell me a very short joke.");

    const responses = await collectResponses(chatModel.stream(prompt));
    expect(responses).not.toHaveLength(0);

    // Find the response with usage metadata (comes from message_delta event)
    const lastResponseWithUsage = responses
      .filter((response) => (response.metadata?.usage?.totalTokens ?? 0) > 0)
      .reduce<ChatResponse | null>((_, response) => response, null);

    expect(lastResponseWithUsage).not.toBeNull();

    if (!lastResponseWithUsage?.metadata?.usage) {
      throw new Error("Expected usage metadata in streaming response");
    }
    const usage = lastResponseWithUsage.metadata.usage;
    logger.info(
      `Streaming usage - Input: ${usage.promptTokens}, Output: ${usage.completionTokens}, Total: ${usage.totalTokens}`,
    );

    // Verify both input and output tokens are captured
    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.completionTokens).toBeGreaterThan(0);
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);

    // Also verify message metadata is captured
    expect(lastResponseWithUsage.metadata?.id ?? "").not.toBe("");
    expect(lastResponseWithUsage.metadata?.model ?? "").not.toBe("");
  });

  it("function call test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo and Paris? Return the result in Celsius.",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_HAIKU_4_5)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info(`Response: ${inspect(response, { depth: null })}`);

    const generation = response.result;
    expect(generation).not.toBeNull();
    expect(generation?.output).not.toBeNull();
    expect(generation?.output.text ?? "").toContain("30");
    expect(generation?.output.text ?? "").toContain("10");
    expect(generation?.output.text ?? "").toContain("15");
    expect(response.metadata).not.toBeNull();
    expect(response.metadata?.usage).not.toBeNull();
    expect(response.metadata?.usage?.totalTokens ?? 0).toBeGreaterThan(100);
  });

  it("stream function call test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo and Paris? Return the result in Celsius.",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_HAIKU_4_5)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const responseFlux = chatModel.stream(new Prompt(messages, promptOptions));

    const content = collectGenerationText(await collectResponses(responseFlux));

    logger.info(`Streaming Response: ${content}`);
    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it("stream function call usage test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo and Paris? Return the result in Celsius.",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_HAIKU_4_5)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const responseFlux = chatModel.stream(new Prompt(messages, promptOptions));

    const lastResponse = await collectLastResponseWithUsage(responseFlux);

    logger.info(
      `Streaming Response with usage: ${inspect(lastResponse, { depth: null })}`,
    );

    expect(lastResponse).not.toBeNull();
    if (!lastResponse?.metadata?.usage) {
      throw new Error("Expected usage metadata in streaming tool response");
    }
    const usage = lastResponse.metadata.usage;
    expect(usage).not.toBeNull();
    // Tool calling uses more tokens due to multi-turn conversation
    expect(usage.totalTokens).toBeGreaterThan(100);
  });

  it("bean stream output converter records", async () => {
    const beanOutputConverter = new BeanOutputConverter({
      schema: ActorsFilmsRecordSchema,
      outputType: ActorsFilmsRecord,
    });

    const format = beanOutputConverter.format;
    const template = `
Generate the filmography of 5 movies for Tom Hanks.
{format}
`;
    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .variables({ format })
      .build();
    const prompt = new Prompt(promptTemplate.createMessage());

    const generationTextFromStream = collectGenerationText(
      await collectResponses(chatModel.stream(prompt)),
    );

    const actorsFilms = beanOutputConverter.convert(generationTextFromStream);
    logger.info(`Actors films: ${inspect(actorsFilms, { depth: null })}`);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("validate stream call response metadata", async () => {
    const model = TEST_MODEL_4_20250514;
    const response = await collectLastResponse(
      ChatClient.create(chatModel)
        .prompt()
        .options(AnthropicChatOptions.builder().model(model))
        .user(
          "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
        )
        .stream()
        .chatResponse(),
    );

    expect(response).not.toBeNull();
    logger.info(`Response: ${inspect(response, { depth: null })}`);
    if (!response) {
      throw new Error("Expected streaming response");
    }
    validateChatResponseMetadata(response, model);
  });

  it("test tool use content block", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo and Paris? Return the result in Celsius.",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_HAIKU_4_5)
      .internalToolExecutionEnabled(false)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info(`Response: ${inspect(response, { depth: null })}`);
    for (const generation of response.results) {
      const message = generation.output;
      if (message.toolCalls.length > 0) {
        expect(message.toolCalls).not.toHaveLength(0);
        const toolCall = message.toolCalls[0];
        expect(toolCall?.id ?? "").not.toBe("");
        expect(toolCall?.name ?? "").not.toBe("");
        expect(toolCall?.arguments ?? "").not.toBe("");
      }
    }
  });

  it("test tool choice any", async () => {
    // A user question that would not typically result in a tool request
    const userMessage = new UserMessage({ content: "Say hi" });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .toolChoice({ type: "any" } as ToolChoice)
      .internalToolExecutionEnabled(false)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info(`Response: ${inspect(response, { depth: null })}`);
    expect(response.results).not.toBeNull();
    // When tool choice is "any", the model MUST use at least one tool
    const hasToolCalls = response.results.some(
      (generation) => generation.output.toolCalls.length > 0,
    );
    expect(hasToolCalls).toBe(true);
  });

  it("test tool choice tool", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco? Return the result in Celsius.",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .toolChoice({ type: "tool", name: "getFunResponse" } as ToolChoice)
      .internalToolExecutionEnabled(false)
      .toolCallbacks([
        createWeatherToolCallback("getCurrentWeather"),
        // Based on the user's question the model should want to call
        // getCurrentWeather
        // however we're going to force getFunResponse
        createWeatherToolCallback("getFunResponse"),
      ])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info(`Response: ${inspect(response, { depth: null })}`);
    expect(response.results).not.toBeNull();
    // When tool choice is a specific tool, the model MUST use that specific tool
    const allToolCalls = response.results.flatMap(
      (generation) => generation.output.toolCalls,
    );
    expect(allToolCalls).not.toHaveLength(0);
    expect(allToolCalls).toHaveLength(1);
    expect(allToolCalls[0]?.name).toBe("getFunResponse");
  });

  it("test tool choice none", async () => {
    const userMessage = new UserMessage({
      content: "What's the weather like in San Francisco?",
    });

    const messages: Message[] = [userMessage];

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .toolChoice({ type: "none" } as ToolChoice)
      .toolCallbacks([createWeatherToolCallback("getCurrentWeather")])
      .build();

    const response = await chatModel.call(new Prompt(messages, promptOptions));

    logger.info(`Response: ${inspect(response, { depth: null })}`);
    expect(response.results).not.toBeNull();
    // When tool choice is "none", the model MUST NOT use any tools
    const allToolCalls = response.results.flatMap(
      (generation) => generation.output.toolCalls,
    );
    expect(allToolCalls).toHaveLength(0);
  });

  it("multi modality test", async () => {
    const imageData = readFileSync(resolve(__dirname, "resources", "test.png"));

    const userMessage = new UserMessage({
      content: "Explain what do you see on this picture?",
      media: [new Media({ mimeType: MediaFormat.IMAGE_PNG, data: imageData })],
    });

    const response = await chatModel.call(new Prompt([userMessage]));

    logger.info(`Response text: ${response.result?.output.text ?? ""}`);
    expect(response.result?.output.text ?? "").toMatch(
      /bananas|apple|bowl|basket|fruit/,
    );
  });

  it("multi modality pdf test", async () => {
    const pdfData = readFileSync(
      resolve(__dirname, "resources", "spring-ai-reference-overview.pdf"),
    );

    const userMessage = new UserMessage({
      content:
        "You are a very professional document summarization specialist. Please summarize the given document.",
      media: [new Media({ mimeType: MediaFormat.DOC_PDF, data: pdfData })],
    });

    const response = await chatModel.call(new Prompt([userMessage]));

    logger.info(`Response text: ${response.result?.output.text ?? ""}`);
    expect(response.result?.output.text ?? "").toMatch(
      /Spring AI|portable API/,
    );
  });

  it("thinking test", async () => {
    const userMessage = new UserMessage({
      content:
        "Are there an infinite number of prime numbers such that n mod 4 == 3?",
    });

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .temperature(1.0) // temperature must be 1 when thinking is enabled
      .maxTokens(16000)
      .thinkingEnabled(10000)
      .build();

    const response = await chatModel.call(
      new Prompt([userMessage], promptOptions),
    );

    expect(response.results).not.toHaveLength(0);
    expect(response.results.length).toBeGreaterThanOrEqual(2);

    for (const generation of response.results) {
      const message = generation.output;
      if (message.text != null && message.text.trim() !== "") {
        // Text block
        expect(message.text).not.toBe("");
      } else if (message.metadata != null && "signature" in message.metadata) {
        // Thinking block
        expect(message.metadata.signature).not.toBeNull();
      } else if (message.metadata != null && "data" in message.metadata) {
        // Redacted thinking block
        expect(message.metadata.data).not.toBeNull();
      }
    }
  }, 60_000);

  it("thinking with streaming test", async () => {
    const userMessage = new UserMessage({
      content:
        "Are there an infinite number of prime numbers such that n mod 4 == 3?",
    });

    const promptOptions = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .temperature(1.0) // temperature must be 1 when thinking is enabled
      .maxTokens(16000)
      .thinkingEnabled(10000)
      .build();

    const responses = await collectResponses(
      chatModel.stream(new Prompt([userMessage], promptOptions)),
    );

    // Verify we got text content
    const content = collectGenerationText(responses);

    logger.info(`Thinking streaming response: ${content}`);
    expect(content).not.toBe("");

    // Verify signature was captured in the stream
    const hasSignature = responses
      .flatMap((response) => response.results)
      .some(
        (generation) =>
          generation.output.metadata != null &&
          "signature" in generation.output.metadata,
      );

    expect(hasSignature).toBe(true);
  }, 60_000);

  it("test plain text citation", async () => {
    const document = AnthropicCitationDocument.builder()
      .plainText(
        "The Eiffel Tower is located in Paris, France. It was completed in 1889 and stands 330 meters tall.",
      )
      .title("Eiffel Tower Facts")
      .citationsEnabled(true)
      .build();

    const userMessage = new UserMessage({
      content:
        "Based solely on the provided document, where is the Eiffel Tower located and when was it completed?",
    });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .maxTokens(2048)
      .temperature(0.0)
      .citationDocuments([document])
      .build();

    const response = await chatModel.call(new Prompt([userMessage], options));

    expect(response).not.toBeNull();
    expect(response.results).not.toHaveLength(0);
    expect(response.result?.output.text ?? "").not.toBe("");

    const citationsObj = response.metadata?.get<Citation[]>("citations") ?? [];
    expect(citationsObj).toBeDefined();
    expect(citationsObj).not.toHaveLength(0);

    for (const citation of citationsObj ?? []) {
      expect(citation.type).toBe(Citation.LocationType.CHAR_LOCATION);
      expect(citation.citedText).not.toBe("");
      expect(citation.documentIndex).toBe(0);
      expect(citation.documentTitle).toBe("Eiffel Tower Facts");
      expect(citation.startCharIndex ?? -1).toBeGreaterThanOrEqual(0);
      expect(citation.endCharIndex ?? -1).toBeGreaterThan(
        citation.startCharIndex ?? -1,
      );
    }
  });

  it("test multiple citation documents", async () => {
    const parisDoc = AnthropicCitationDocument.builder()
      .plainText(
        "Paris is the capital city of France. It has a population of about 2.1 million people.",
      )
      .title("Paris Information")
      .citationsEnabled(true)
      .build();

    const eiffelDoc = AnthropicCitationDocument.builder()
      .plainText(
        "The Eiffel Tower was designed by Gustave Eiffel and completed in 1889 for the World's Fair.",
      )
      .title("Eiffel Tower History")
      .citationsEnabled(true)
      .build();

    const userMessage = new UserMessage({
      content:
        "Based solely on the provided documents, what is the capital of France and who designed the Eiffel Tower?",
    });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .maxTokens(1024)
      .temperature(0.0)
      .citationDocuments([parisDoc, eiffelDoc])
      .build();

    const response = await chatModel.call(new Prompt([userMessage], options));

    expect(response).not.toBeNull();
    expect(response.results).not.toHaveLength(0);
    expect(response.result?.output.text ?? "").not.toBe("");

    const citationsObj = response.metadata?.get<Citation[]>("citations") ?? [];
    expect(citationsObj).toBeDefined();
    expect(citationsObj).not.toHaveLength(0);

    const hasDoc0 = (citationsObj ?? []).some(
      (citation) => citation.documentIndex === 0,
    );
    const hasDoc1 = (citationsObj ?? []).some(
      (citation) => citation.documentIndex === 1,
    );
    expect(hasDoc0 && hasDoc1).toBe(true);

    for (const citation of citationsObj ?? []) {
      expect(citation.type).toBe(Citation.LocationType.CHAR_LOCATION);
      expect(citation.citedText).not.toBe("");
      expect([0, 1]).toContain(citation.documentIndex);
      expect(["Paris Information", "Eiffel Tower History"]).toContain(
        citation.documentTitle,
      );
      expect(citation.startCharIndex ?? -1).toBeGreaterThanOrEqual(0);
      expect(citation.endCharIndex ?? -1).toBeGreaterThan(
        citation.startCharIndex ?? -1,
      );
    }
  });

  it("test custom content citation", async () => {
    const document = AnthropicCitationDocument.builder()
      .customContent(
        "The Great Wall of China is approximately 21,196 kilometers long.",
        "It was built over many centuries, starting in the 7th century BC.",
        "The wall was constructed to protect Chinese states from invasions.",
      )
      .title("Great Wall Facts")
      .citationsEnabled(true)
      .build();

    const userMessage = new UserMessage({
      content:
        "Based solely on the provided document, how long is the Great Wall of China and when was it started?",
    });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .maxTokens(1024)
      .temperature(0.0)
      .citationDocuments([document])
      .build();

    const response = await chatModel.call(new Prompt([userMessage], options));

    expect(response).not.toBeNull();
    expect(response.results).not.toHaveLength(0);
    expect(response.result?.output.text ?? "").not.toBe("");

    const citationsObj = response.metadata?.get<Citation[]>("citations") ?? [];
    expect(citationsObj).toBeDefined();
    expect(citationsObj).not.toHaveLength(0);

    for (const citation of citationsObj ?? []) {
      expect(citation.type).toBe(Citation.LocationType.CONTENT_BLOCK_LOCATION);
      expect(citation.citedText).not.toBe("");
      expect(citation.documentIndex).toBe(0);
      expect(citation.documentTitle).toBe("Great Wall Facts");
      expect(citation.startBlockIndex ?? -1).toBeGreaterThanOrEqual(0);
      expect(citation.endBlockIndex ?? -1).toBeGreaterThanOrEqual(
        citation.startBlockIndex ?? -1,
      );
    }
  });

  it("test pdf citation", async () => {
    const document = AnthropicCitationDocument.builder()
      .pdfFile(
        resolve(__dirname, "resources", "spring-ai-reference-overview.pdf"),
      )
      .title("Spring AI Reference")
      .citationsEnabled(true)
      .build();

    const userMessage = new UserMessage({
      content: "Based solely on the provided document, what is Spring AI?",
    });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_20250514)
      .maxTokens(1024)
      .temperature(0.0)
      .citationDocuments([document])
      .build();

    const response = await chatModel.call(new Prompt([userMessage], options));

    expect(response).not.toBeNull();
    expect(response.results).not.toHaveLength(0);
    expect(response.result?.output.text ?? "").not.toBe("");

    const citationsObj = response.metadata?.get<Citation[]>("citations") ?? [];
    expect(citationsObj).toBeDefined();
    expect(citationsObj).not.toHaveLength(0);

    for (const citation of citationsObj ?? []) {
      expect(citation.type).toBe(Citation.LocationType.PAGE_LOCATION);
      expect(citation.citedText).not.toBe("");
      expect(citation.documentIndex).toBe(0);
      expect(citation.documentTitle).toBe("Spring AI Reference");
      expect(citation.startPageNumber ?? 0).toBeGreaterThan(0);
      expect(citation.endPageNumber ?? 0).toBeGreaterThanOrEqual(
        citation.startPageNumber ?? 0,
      );
    }
  });

  it("structured output with json schema", async () => {
    const schema = `
{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "capital": {"type": "string"},
    "population": {"type": "integer"}
  },
  "required": ["name", "capital"],
  "additionalProperties": false
}
`;

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_6)
      .outputSchema(schema)
      .build();

    const response = await chatModel.call(
      new Prompt("Tell me about France. Respond in JSON.", options),
    );

    expect(response).not.toBeNull();
    const text = response.result?.output.text ?? "";
    expect(text).not.toBe("");
    logger.info(`Structured output response: ${text}`);
    // The response should contain JSON with the expected fields
    expect(text).toContain("name");
    expect(text).toContain("capital");
  });

  it("structured output with effort", async () => {
    const schema = `
{
  "type": "object",
  "properties": {
    "answer": {"type": "integer"}
  },
  "required": ["answer"],
  "additionalProperties": false
}
`;

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_6)
      .outputSchema(schema)
      .effort("low" as NonNullable<OutputConfig["effort"]>)
      .build();

    const response = await chatModel.call(
      new Prompt(
        "What is 2+2? Return the result as JSON with an 'answer' field.",
        options,
      ),
    );

    expect(response).not.toBeNull();
    const text = response.result?.output.text ?? "";
    expect(text).not.toBe("");
    logger.info(`Structured output with effort response: ${text}`);
    expect(text).toContain("answer");
  });

  it("web search test", async () => {
    const webSearch = new AnthropicWebSearchTool({ maxUses: 3 });

    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL_4_6)
      .webSearchTool(webSearch)
      .build();

    const response = await chatModel.call(
      new Prompt("What is the latest released version of Spring AI?", options),
    );

    expect(response.result?.output.text ?? "").not.toBe("");
    logger.info(`Web search response: ${response.result?.output.text ?? ""}`);

    // Verify web search results are surfaced in metadata
    const results =
      response.metadata?.get<AnthropicWebSearchResult[]>(
        "web-search-results",
      ) ?? [];
    expect(results).not.toBeNull();
    expect(results).not.toHaveLength(0);
    expect(results[0]?.url ?? "").not.toBe("");
    expect(results[0]?.title ?? "").not.toBe("");

    // Verify web search citations if present
    const citations = response.metadata?.get<Citation[]>("citations") ?? [];
    if (citations != null && citations.length > 0) {
      logger.info(`Web search citations received: ${citations.length}`);
      citations
        .filter(
          (citation) =>
            citation.type === Citation.LocationType.WEB_SEARCH_RESULT_LOCATION,
        )
        .forEach((citation) => {
          logger.info(
            `Web search citation: url=${citation.url}, title=${citation.documentTitle}`,
          );
        });
      expect(
        citations.some(
          (citation) =>
            citation.type ===
              Citation.LocationType.WEB_SEARCH_RESULT_LOCATION &&
            (citation.url ?? "") !== "",
        ),
      ).toBe(true);
    }
  }, 60_000);
});

class ActorsFilmsRecord {
  actor!: string;

  movies!: string[];
}

const ActorsFilmsRecordSchema = z.object({
  actor: z.string(),
  movies: z.array(z.string()),
});

function createWeatherToolCallback(name: string) {
  const weatherService = new MockWeatherService();
  return FunctionToolCallback.builder<WeatherRequest, WeatherResponse>(
    name,
    weatherService.apply.bind(weatherService),
  )
    .description(
      "Get the weather in location. Return temperature in 36°F or 36°C format. Use multi-turn if needed.",
    )
    .inputType(WeatherRequestSchema)
    .build();
}

async function collectResponses(
  stream: Observable<ChatResponse>,
): Promise<ChatResponse[]> {
  return await firstValueFrom(stream.pipe(toArray()));
}

function collectGenerationText(responses: ChatResponse[]): string {
  return responses
    .flatMap((response) =>
      response.results.map((generation: Generation) => generation.output.text),
    )
    .filter((text): text is string => text != null)
    .join("");
}

async function collectLastResponse(
  stream: Observable<ChatResponse>,
): Promise<ChatResponse | null> {
  const responses = await collectResponses(stream);
  return responses.at(-1) ?? null;
}

async function collectLastResponseWithUsage(
  stream: Observable<ChatResponse>,
): Promise<ChatResponse | null> {
  const responses = await collectResponses(stream);
  return responses
    .filter((response) => (response.metadata?.usage?.totalTokens ?? 0) > 0)
    .reduce<ChatResponse | null>((_, response) => response, null);
}
