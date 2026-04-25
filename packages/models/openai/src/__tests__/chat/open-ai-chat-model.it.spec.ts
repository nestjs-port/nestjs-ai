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

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ChatClient } from "@nestjs-ai/client-chat";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  DefaultToolCallingManager,
  DefaultUsage,
  EmptyUsage,
  FunctionToolCallback,
  InMemoryChatMemoryRepository,
  ListOutputConverter,
  MapOutputConverter,
  MessageWindowChatMemory,
  Prompt,
  PromptTemplate,
  SystemMessage,
  SystemPromptTemplate,
  UserMessage,
  JsonSchemaOutputConverter,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, type Observable, tap, toArray } from "rxjs";
import { assert, describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "./mock-weather-service.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModel IT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("OpenAiChatModelIT");

  const systemPromptResource = readFileSync(
    new URL("system-message.st", import.meta.url),
  );

  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
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
    // needs fine tuning... evaluateQuestionAndAnswer(request, response, false);
  });

  it("message history test", async () => {
    const userMessage = new UserMessage({
      content:
        "Tell me about 3 famous pirates from the Golden Age of Piracy and why they did.",
    });
    const systemPromptTemplate = new SystemPromptTemplate(systemPromptResource);
    const systemMessage = systemPromptTemplate.createMessage({
      name: "Bob",
      voice: "pirate",
    });
    const prompt = new Prompt([userMessage, systemMessage]);

    let response = await chatModel.call(prompt);
    expect(response.result?.output.text).toMatch(/Blackbeard|Bartholomew/);
    if (response.result == null) {
      throw new Error("Expected assistant response to be present");
    }

    const promptWithMessageHistory = new Prompt([
      new UserMessage({ content: "Dummy" }),
      response.result.output,
      new UserMessage({ content: "Repeat the last assistant message." }),
    ]);
    response = await chatModel.call(promptWithMessageHistory);

    expect(response.result?.output.text).toMatch(/Blackbeard|Bartholomew/);
  });

  it("stream completeness test", async () => {
    const userMessage = new UserMessage({
      content:
        "List ALL natural numbers in range [1, 100]. Make sure to not omit any. Print the full list here, one after another.",
    });
    const prompt = new Prompt([userMessage]);

    const answer = await collectChatResponseText(chatModel.stream(prompt));
    logger.info("%s", answer);

    for (let n = 1; n <= 100; n += 1) {
      expect(answer).toContain(String(n));
    }
  });

  it("stream completeness test with chat response", async () => {
    const userMessage = new UserMessage({
      content: "Who is George Washington? - use first as 1st",
    });
    const prompt = new Prompt([userMessage]);

    const chatClient = ChatClient.builder(chatModel).build();
    const answer = await collectChatResponseText(
      chatClient.prompt(prompt).stream().chatResponse(),
    );

    logger.info("%s", answer);
    expect(answer).toContain("1st ");
  });

  it("ensure chat response as content does not swallow blank space", async () => {
    const userMessage = new UserMessage({
      content: "Who is George Washington? - use first as 1st",
    });
    const prompt = new Prompt([userMessage]);

    const chatClient = ChatClient.builder(chatModel).build();
    const answer = await collectContentText(
      chatClient.prompt(prompt).stream().content(),
    );

    logger.info("%s", answer);
    expect(answer).toContain("1st ");
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

    const responses = await withTimeout(
      lastValueFrom(chatModel.stream(prompt).pipe(toArray())),
      120_000,
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
      .reasoningEffort("minimal")
      .seed(1)
      .build();

    const prompt = new Prompt(
      "List two colors of the Polish flag. Be brief.",
      promptOptions,
    );
    const streamingTokenUsage = (
      await withTimeout(lastValueFrom(chatModel.stream(prompt)), 120_000)
    ).metadata.usage;
    const referenceTokenUsage = (await chatModel.call(prompt)).metadata.usage;

    expect(streamingTokenUsage.promptTokens).toBeGreaterThan(0);
    expect(streamingTokenUsage.completionTokens).toBeGreaterThan(0);
    expect(streamingTokenUsage.totalTokens).toBeGreaterThan(0);

    expectCloseToPercentage(
      streamingTokenUsage.promptTokens,
      referenceTokenUsage.promptTokens,
      25,
    );
    expectCloseToPercentage(
      streamingTokenUsage.completionTokens,
      referenceTokenUsage.completionTokens,
      25,
    );
    expectCloseToPercentage(
      streamingTokenUsage.totalTokens,
      referenceTokenUsage.totalTokens,
      25,
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
      .variables({
        subject: "ice cream flavors",
        format,
      })
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

    const result = await outputConverter.convert(generation.output.text ?? "");
    expect(result.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("bean output converter", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsSchema,
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

    const actorsFilms = await outputConverter.convert(
      generation.output.text ?? "",
    );
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean output converter records", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsSchema,
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

    const actorsFilms = await outputConverter.convert(
      generation.output.text ?? "",
    );
    logger.info("%o", actorsFilms);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean stream output converter records", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsSchema,
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

    const actorsFilms = await outputConverter.convert(generationTextFromStream);
    logger.info("%o", actorsFilms);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("function call test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo, and Paris? Answer in Celsius.",
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
        "What's the weather like in San Francisco, Tokyo, and Paris in Celsius.",
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

    expect(content).toMatch(/30\.0|30/);
    expect(content).toMatch(/10\.0|10/);
    expect(content).toMatch(/15\.0|15/);
  });

  it("function call usage test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo, and Paris? Answer in Celsius.",
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

    const chatResponse = await chatModel.call(
      new Prompt(messages, promptOptions),
    );
    logger.info("Response: %o", chatResponse);
    const usage = chatResponse.metadata.usage;

    logger.info("Usage: %o", usage);
    assert.exists(usage);
    expect(usage).not.toBeInstanceOf(EmptyUsage);
    expect(usage).toBeInstanceOf(DefaultUsage);
    expect(usage.promptTokens).toBeGreaterThan(500);
    expect(usage.promptTokens).toBeLessThan(800);
    expect(usage.completionTokens).toBeGreaterThan(600);
    expect(usage.completionTokens).toBeLessThan(1200);
    expect(usage.totalTokens).toBeGreaterThan(1200);
    expect(usage.totalTokens).toBeLessThan(2000);
  });

  it("stream function call usage test", async () => {
    const userMessage = new UserMessage({
      content:
        "What's the weather like in San Francisco, Tokyo, and Paris? Answer in Celsius.",
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
      .streamOptions({ include_usage: true })
      .reasoningEffort("minimal")
      .build();

    const response = chatModel.stream(new Prompt(messages, promptOptions));
    const usage = (await withTimeout(lastValueFrom(response), 120_000)).metadata
      .usage;

    logger.info("Usage: %o", usage);
    assert.exists(usage);
    expect(usage).not.toBeInstanceOf(EmptyUsage);
    expect(usage).toBeInstanceOf(DefaultUsage);
    expect(usage.promptTokens).toBeGreaterThan(500);
    expect(usage.promptTokens).toBeLessThan(800);
    expect(usage.completionTokens).toBeGreaterThan(200);
    expect(usage.completionTokens).toBeLessThan(500);
    expect(usage.totalTokens).toBeGreaterThan(600);
    expect(usage.totalTokens).toBeLessThan(1300);
  });

  it("multi modality embedded image", async () => {
    const imageResource = readFileSync(new URL("test.png", import.meta.url));

    const userMessage = new UserMessage({
      content: "Explain what do you see on this picture?",
      media: [
        new Media({ mimeType: MediaFormat.IMAGE_PNG, data: imageResource }),
      ],
    });

    const response = await chatModel.call(
      new Prompt([userMessage], OpenAiChatOptions.builder().build()),
    );

    logger.info("%s", response.result?.output.text ?? "");
    expect(response.result?.output.text).toMatch(
      /bananas|apple|bowl|basket|fruit stand/,
    );
  });

  it("multi modality image url", async () => {
    const userMessage = new UserMessage({
      content: "Explain what do you see on this picture?",
      media: [
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: new URL(
            "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
          ),
        }),
      ],
    });

    const response = await chatModel.call(
      new Prompt([userMessage], OpenAiChatOptions.builder().build()),
    );

    logger.info("%s", response.result?.output.text ?? "");
    expect(response.result?.output.text).toMatch(
      /bananas|apple|bowl|basket|fruit stand/,
    );
  });

  it("streaming multi modality image url", async () => {
    const userMessage = new UserMessage({
      content: "Explain what do you see on this picture?",
      media: [
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: new URL(
            "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
          ),
        }),
      ],
    });

    const content = await collectChatResponseText(
      chatModel.stream(
        new Prompt([userMessage], OpenAiChatOptions.builder().build()),
      ),
    );

    logger.info("Response: %s", content);
    expect(content).toMatch(/bananas|apple|bowl|basket|fruit stand/);
  });

  it.each(["gpt-4o-audio-preview"])(
    "multi modality output audio",
    async (modelName) => {
      const userMessage = new UserMessage({
        content: "Tell me joke about Spring Framework",
      });

      const response = await chatModel.call(
        new Prompt(
          [userMessage],
          OpenAiChatOptions.builder()
            .model(modelName)
            .outputModalities(["text", "audio"])
            .outputAudio({ voice: "alloy", format: "wav" })
            .build(),
        ),
      );

      logger.info("%s", response.result?.output.text ?? "");
      expect(response.result?.output.text).not.toBe("");

      const audio = response.result?.output.media[0]?.dataAsByteArray;
      assert.exists(audio);
      if (audio == null) {
        throw new Error("Expected audio data to be present");
      }
      expect(audio.length).toBeGreaterThan(0);
    },
  );

  it.each(["gpt-4o-audio-preview"])(
    "streaming multi modality output audio",
    async (modelName) => {
      const userMessage = new UserMessage({
        content: "Tell me joke about Spring Framework",
      });

      await expect(
        withTimeout(
          lastValueFrom(
            chatModel.stream(
              new Prompt(
                [userMessage],
                OpenAiChatOptions.builder()
                  .model(modelName)
                  .outputModalities(["text", "audio"])
                  .outputAudio({ voice: "alloy", format: "wav" })
                  .build(),
              ),
            ),
          ),
          120_000,
        ),
      ).rejects.toThrow(
        /audio\.format.*wav.*stream=true.*Supported values are: 'pcm16/i,
      );
    },
  );

  it("validate call response metadata", async () => {
    const model = OpenAiChatOptions.DEFAULT_CHAT_MODEL;
    const chatClient = ChatClient.create(chatModel);
    const chatResponseResult = await chatClient
      .prompt()
      .options(OpenAiChatOptions.builder().model(model))
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();
    if (chatResponseResult == null) {
      throw new Error("Expected chat response to be present");
    }
    const chatResponse = chatResponseResult;

    logger.info("%o", chatResponse);
    expect(chatResponse.metadata.id).not.toBe("");
    expect(chatResponse.metadata.model).toContain(model);
    expect(chatResponse.metadata.usage.promptTokens).toBeGreaterThan(0);
    expect(chatResponse.metadata.usage.completionTokens).toBeGreaterThan(0);
    expect(chatResponse.metadata.usage.totalTokens).toBeGreaterThan(0);
  });

  it("validate store and metadata", async () => {
    const options = OpenAiChatOptions.builder()
      .store(true)
      .metadata({ type: "dev" })
      .build();

    const response = await chatModel.call(
      new Prompt("Tell me a joke", options),
    );

    assert.exists(response);
  });

  it("chat memory", async () => {
    const memory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    const userMessage1 = new UserMessage({ content: "My name is James Bond" });
    await memory.add(conversationId, userMessage1);
    const response1 = await chatModel.call(
      new Prompt(await memory.get(conversationId)),
    );

    assert.exists(response1);
    assert.exists(response1.result);
    await memory.add(conversationId, response1.result.output);

    const userMessage2 = new UserMessage({ content: "What is my name?" });
    await memory.add(conversationId, userMessage2);
    const response2 = await chatModel.call(
      new Prompt(await memory.get(conversationId)),
    );

    assert.exists(response2);
    assert.exists(response2.result);
    await memory.add(conversationId, response2.result.output);

    expect(response2.results).toHaveLength(1);
    expect(response2.result?.output.text).toContain("James Bond");
  });

  it("chat memory with tools", async () => {
    const toolCallingManager = new DefaultToolCallingManager();
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const conversationId = randomUUID();

    const chatOptions = OpenAiChatOptions.builder()
      .toolCallbacks([
        FunctionToolCallback.builder(
          "multiply",
          (input: { a: number; b: number }) => input.a * input.b,
        )
          .description("Multiply the two numbers")
          .inputType(
            z.object({
              a: z.number(),
              b: z.number(),
            }),
          )
          .build(),
      ])
      .internalToolExecutionEnabled(false)
      .build();
    const prompt = new Prompt(
      [
        new SystemMessage({ content: "You are a helpful assistant." }),
        new UserMessage({ content: "What is 6 * 8?" }),
      ],
      chatOptions,
    );
    await chatMemory.add(conversationId, prompt.instructions);

    let promptWithMemory = new Prompt(
      await chatMemory.get(conversationId),
      chatOptions,
    );
    let chatResponse = await chatModel.call(promptWithMemory);
    if (chatResponse.result == null) {
      throw new Error("Expected initial chat response to be present");
    }
    await chatMemory.add(conversationId, chatResponse.result.output);

    while (chatResponse.hasToolCalls()) {
      const toolExecutionResult = await toolCallingManager.executeToolCalls(
        promptWithMemory,
        chatResponse,
      );
      const history = toolExecutionResult.conversationHistory();
      await chatMemory.add(conversationId, history[history.length - 1]);
      promptWithMemory = new Prompt(
        await chatMemory.get(conversationId),
        chatOptions,
      );
      chatResponse = await chatModel.call(promptWithMemory);
      if (chatResponse.result == null) {
        throw new Error("Expected tool-followup chat response to be present");
      }
      await chatMemory.add(conversationId, chatResponse.result.output);
    }

    assert.exists(chatResponse);
    expect(chatResponse.result?.output.text).toContain("48");

    const newUserMessage = new UserMessage({
      content: "What did I ask you earlier?",
    });
    await chatMemory.add(conversationId, newUserMessage);

    const newResponse = await chatModel.call(
      new Prompt(await chatMemory.get(conversationId)),
    );

    assert.exists(newResponse);
    expect(newResponse.result?.output.text).toContain("6");
    expect(newResponse.result?.output.text).toContain("8");
  });

  it("test open ai api rejects unknown parameter", async () => {
    const options = OpenAiChatOptions.builder()
      .extraBody({
        extra_body: { num_ctx: 4096, num_predict: 10, top_k: 40 },
      })
      .build();

    const prompt = new Prompt("Test prompt", options);
    await expect(chatModel.call(prompt)).rejects.toThrow(
      /extra_body.*Unknown parameter|Unknown parameter.*extra_body/i,
    );
  });
});

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

function expectCloseToPercentage(
  actual: number,
  expected: number,
  percentage: number,
): void {
  const tolerance =
    expected === 0 ? 0 : Math.abs(expected) * (percentage / 100);
  const withinTolerance =
    expected === 0
      ? actual === expected
      : Math.abs(actual - expected) <= tolerance;

  expect(withinTolerance).toBe(true);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle != null) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function collectChatResponseText(
  stream: Observable<{
    results: Array<{ output: { text: string | null } }>;
  }>,
): Promise<string> {
  let answer = "";
  await withTimeout(
    lastValueFrom(
      stream.pipe(
        tap((chatResponse) => {
          if (chatResponse.results.length > 0) {
            answer += chatResponse.results[0]?.output.text ?? "";
          }
        }),
      ),
    ),
    120_000,
  );
  return answer;
}

async function collectContentText(stream: Observable<string>): Promise<string> {
  let answer = "";
  await withTimeout(
    lastValueFrom(
      stream.pipe(
        tap((chunk) => {
          answer += chunk;
        }),
      ),
    ),
    120_000,
  );
  return answer;
}
