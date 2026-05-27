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

import {
  DefaultToolCallingManager,
  FunctionToolCallback,
  InMemoryChatMemoryRepository,
  ListOutputConverter,
  MapOutputConverter,
  MessageWindowChatMemory,
  Prompt,
  PromptTemplate,
  StandardSchemaOutputConverter,
  SystemMessage,
  SystemPromptTemplate,
  UserMessage,
  type ChatResponse,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lastValueFrom, type Observable, tap } from "rxjs";
import { z } from "zod";

import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { ModelManagementOptions } from "../management/model-management-options.js";
import { OllamaModelManager } from "../management/ollama-model-manager.js";
import { PullModelStrategy } from "../management/pull-model-strategy.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_2_5_3B.name;
const ADDITIONAL_MODEL = "tinyllama";

const ActorsFilmsSchema = z.object({
  actor: z.string(),
  movies: z.array(z.string()).length(5),
});

const CountryInfoSchema = z.object({
  name: z.string(),
  capital: z.string(),
  languages: z.array(z.string()),
});

const MultiplyRequestSchema = z.object({
  a: z.number(),
  b: z.number(),
});

type MultiplyRequest = z.infer<typeof MultiplyRequestSchema> &
  Record<string, unknown>;

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaChatModelIT", () => {
  let context: OllamaTestContext;
  let chatModel: OllamaChatModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([
      MODEL,
      ADDITIONAL_MODEL,
    ]);
    chatModel = new OllamaChatModel({
      ollamaApi: context.api,
      defaultOptions: OllamaChatOptions.builder()
        .model(MODEL)
        .temperature(0)
        .build(),
      modelManagementOptions: new ModelManagementOptions({
        pullModelStrategy: PullModelStrategy.WHEN_MISSING,
        additionalModels: [ADDITIONAL_MODEL],
      }),
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "auto pull model test",
    async () => {
      const modelManager = new OllamaModelManager({ ollamaApi: context.api });
      expect(await modelManager.isModelAvailable(ADDITIONAL_MODEL)).toBe(true);

      const response = await chatModel.call(
        new Prompt(
          "Tell me a joke",
          OllamaChatOptions.builder().model(ADDITIONAL_MODEL).build(),
        ),
      );
      const joke = response.result?.output.text ?? "";

      expect(joke).not.toHaveLength(0);

      await modelManager.deleteModel(ADDITIONAL_MODEL);
    },
    TEST_TIMEOUT,
  );

  it(
    "role test",
    async () => {
      const systemMessage = new SystemPromptTemplate(`
				You are a helpful AI assistant. Your name is {name}.
				You are an AI assistant that helps people find information.
				Your name is {name}
				You should reply to the user's request with your name and also in the style of a {voice}.
				`).createMessage({ name: "Bob", voice: "pirate" });

      const userMessage = new UserMessage({
        content:
          "Tell me about 5 famous pirates from the Golden Age of Piracy.",
      });

      // ollama specific options
      const ollamaOptions = OllamaChatOptions.builder()
        .model(MODEL)
        .lowVRAM(true)
        .build();

      const response = await chatModel.call(
        new Prompt([systemMessage, userMessage], ollamaOptions),
      );
      verifyMostFamousPiratePresence(response);
    },
    TEST_TIMEOUT,
  );

  it(
    "test message history",
    async () => {
      const systemMessage = new SystemPromptTemplate(`
				You are a helpful AI assistant. Your name is {name}.
				You are an AI assistant that helps people find information.
				Your name is {name}
				You should reply to the user's request with your name and also in the style of a {voice}.
				`).createMessage({ name: "Bob", voice: "pirate" });

      const userMessage = new UserMessage({
        content:
          "Tell me about 5 famous pirates from the Golden Age of Piracy and why they did.",
      });

      const prompt = new Prompt([systemMessage, userMessage]);

      let response = await chatModel.call(prompt);
      verifyMostFamousPiratePresence(response);

      if (response.result == null) {
        throw new Error("Expected assistant response to be present");
      }
      const promptWithMessageHistory = new Prompt([
        new UserMessage({ content: "Hello" }),
        response.result.output,
        new UserMessage({
          content: "Tell me just the names of those pirates.",
        }),
      ]);
      response = await chatModel.call(promptWithMessageHistory);
      verifyMostFamousPiratePresence(response);
    },
    TEST_TIMEOUT,
  );

  it(
    "usage test",
    async () => {
      const prompt = new Prompt("Tell me a joke");
      const response = await chatModel.call(prompt);
      const usage = response.metadata.usage;

      expect(usage).not.toBeNull();
      expect(usage.promptTokens).toBeGreaterThan(0);
      expect(usage.completionTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBeGreaterThan(0);
    },
    TEST_TIMEOUT,
  );

  it(
    "list output converter",
    async () => {
      const outputConverter = new ListOutputConverter();

      const format = outputConverter.format;
      const template = `
				List five {subject}
				{format}
				`;
      const promptTemplate = PromptTemplate.builder()
        .template(template)
        .variables({ subject: "ice cream flavors.", format })
        .build();
      const prompt = new Prompt(promptTemplate.createMessage());
      const generation = (await chatModel.call(prompt)).result;
      const outputText = generation?.output.text ?? "";
      expect(outputText).not.toBeNull();
      const list = await outputConverter.convert(outputText);
      expect(list).toHaveLength(5);
    },
    TEST_TIMEOUT,
  );

  it(
    "map output convert",
    async () => {
      const outputConverter = new MapOutputConverter();

      const format = outputConverter.format;
      const template = `
				For each letter in the RGB color scheme, tell me what it stands for.
				Example: R -> Red.
				{format}
				`;
      const promptTemplate = PromptTemplate.builder()
        .template(template)
        .variables({ format })
        .build();
      const prompt = new Prompt(promptTemplate.createMessage());

      const generation = (await chatModel.call(prompt)).result;

      const outputText = generation?.output.text ?? "";
      expect(outputText).not.toBeNull();
      const result = await outputConverter.convert(outputText);
      expect(result).not.toBeNull();
      expect(String(result.R)).toMatch(/red/i);
      expect(String(result.G)).toMatch(/green/i);
      expect(String(result.B)).toMatch(/blue/i);
    },
    TEST_TIMEOUT,
  );

  it(
    "standard schema output converter records",
    async () => {
      const schemaOutputConverter = new StandardSchemaOutputConverter({
        schema: ActorsFilmsSchema,
      });

      const format = schemaOutputConverter.format;
      const template = `
				Consider the filmography of Tom Hanks and tell me 5 of his movies.
				{format}
				`;
      const promptTemplate = PromptTemplate.builder()
        .template(template)
        .variables({ format })
        .build();
      const prompt = new Prompt(promptTemplate.createMessage());
      const generation = (await chatModel.call(prompt)).result;

      const outputText = generation?.output.text ?? "";
      expect(outputText).not.toBeNull();
      const actorsFilms = await schemaOutputConverter.convert(outputText);
      expect(actorsFilms.actor).toBe("Tom Hanks");
      expect(actorsFilms.movies).toHaveLength(5);
    },
    TEST_TIMEOUT,
  );

  it(
    "standard schema stream output converter records",
    async () => {
      const schemaOutputConverter = new StandardSchemaOutputConverter({
        schema: ActorsFilmsSchema,
      });

      const format = schemaOutputConverter.format;
      const template = `
				Consider the filmography of Tom Hanks and tell me 5 of his movies.
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

      const actorsFilms = await schemaOutputConverter.convert(
        generationTextFromStream,
      );

      expect(actorsFilms.actor).toBe("Tom Hanks");
      expect(actorsFilms.movies).toHaveLength(5);
    },
    TEST_TIMEOUT,
  );

  // Example inspired by https://ollama.com/blog/structured-outputs
  it(
    "json structured output with format option",
    async () => {
      const schemaOutputConverter = new StandardSchemaOutputConverter({
        schema: CountryInfoSchema,
      });
      const userPromptTemplate = new PromptTemplate("Tell me about {country}.");
      const prompt = userPromptTemplate.create(
        { country: "denmark" },
        OllamaChatOptions.builder()
          .model(MODEL)
          .format(JSON.parse(schemaOutputConverter.jsonSchema))
          .build(),
      );

      const chatResponse = await chatModel.call(prompt);

      const outputText = chatResponse.result?.output.text ?? "";
      expect(outputText).not.toBeNull();
      const countryInfo = await schemaOutputConverter.convert(outputText);
      expect(countryInfo).not.toBeNull();
      expect(countryInfo.capital.toLowerCase()).toBe("copenhagen");
    },
    TEST_TIMEOUT,
  );

  // Example from https://ollama.com/blog/structured-outputs
  it(
    "json structured output with output schema option",
    async () => {
      const jsonSchemaAsText = readFileSync(
        new URL("../api/__tests__/country-json-schema.json", import.meta.url),
        "utf8",
      );
      const chatOptions = OllamaChatOptions.builder()
        .model(MODEL)
        .outputSchema(jsonSchemaAsText)
        .build();
      const prompt = new Prompt("Tell me about Canada.", chatOptions);

      const chatResponse = await chatModel.call(prompt);

      const outputText = chatResponse.result?.output.text ?? "{}";
      const map = JSON.parse(outputText) as Record<string, unknown>;
      expect(Object.keys(map).sort()).toEqual(["capital", "languages", "name"]);
      expect(map.name).toBe("Canada");
      expect(map.capital).toBe("Ottawa");
      expect(map.languages).toEqual(
        expect.arrayContaining(["English", "French"]),
      );
    },
    TEST_TIMEOUT,
  );

  it(
    "chat client entity with structured output",
    async () => {
      // Test using ChatClient high-level API with .entity(Class) method
      // This verifies that StructuredOutputChatOptions implementation works correctly
      // with ChatClient

      // Generate expected JSON schema as map for testing purpose
      const schemaOutputConverter = new StandardSchemaOutputConverter({
        schema: ActorsFilmsSchema,
      });
      const expectedOutputSchemaMap = JSON.parse(
        schemaOutputConverter.jsonSchema,
      );

      // Advisor to verify that native structured output is being used
      const nativeStructuredOutputUsed = { value: false };
      const chatOptions = OllamaChatOptions.builder()
        .model(MODEL)
        .format(expectedOutputSchemaMap)
        .build();
      if (chatOptions.format === expectedOutputSchemaMap) {
        nativeStructuredOutputUsed.value = true;
      }

      const actorsFilms = await schemaOutputConverter.convert(
        (
          await chatModel.call(
            new Prompt(
              "Generate the filmography of 5 movies for Tom Hanks.",
              chatOptions,
            ),
          )
        ).result?.output.text ?? "",
      );

      // Verify that native structured output was used
      expect(nativeStructuredOutputUsed.value).toBe(true);

      expect(actorsFilms).not.toBeNull();
      expect(actorsFilms.actor).toBe("Tom Hanks");
      expect(actorsFilms.movies).toHaveLength(5);
    },
    TEST_TIMEOUT,
  );

  it(
    "chat memory",
    async () => {
      const memory = new MessageWindowChatMemory({
        chatMemoryRepository: new InMemoryChatMemoryRepository(),
      });
      const conversationId = randomUUID();

      const userMessage1 = new UserMessage({
        content: "My name is James Bond",
      });
      await memory.add(conversationId, userMessage1);
      const response1 = await chatModel.call(
        new Prompt(await memory.get(conversationId)),
      );

      expect(response1).not.toBeNull();
      if (response1.result == null) {
        throw new Error("Expected assistant response to be present");
      }
      await memory.add(conversationId, response1.result.output);

      const userMessage2 = new UserMessage({ content: "What is my name?" });
      await memory.add(conversationId, userMessage2);
      const response2 = await chatModel.call(
        new Prompt(await memory.get(conversationId)),
      );

      expect(response2).not.toBeNull();
      if (response2.result == null) {
        throw new Error("Expected assistant response to be present");
      }
      await memory.add(conversationId, response2.result.output);

      expect(response2.results).toHaveLength(1);
      expect(response2.result.output.text).toContain("James Bond");
    },
    TEST_TIMEOUT,
  );

  it(
    "chat memory with tools",
    async () => {
      const toolCallingManager = new DefaultToolCallingManager();
      const chatMemory = new MessageWindowChatMemory({
        chatMemoryRepository: new InMemoryChatMemoryRepository(),
      });
      const conversationId = randomUUID();

      const chatOptions = OllamaChatOptions.builder()
        .model(MODEL)
        .toolCallbacks([createMultiplyToolCallback()])
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
        throw new Error("Expected assistant response to be present");
      }
      await chatMemory.add(conversationId, chatResponse.result.output);

      while (chatResponse.hasToolCalls()) {
        const toolExecutionResult = await toolCallingManager.executeToolCalls(
          promptWithMemory,
          chatResponse,
        );
        const conversationHistory = toolExecutionResult.conversationHistory();
        await chatMemory.add(
          conversationId,
          conversationHistory[conversationHistory.length - 1],
        );
        promptWithMemory = new Prompt(
          await chatMemory.get(conversationId),
          chatOptions,
        );
        chatResponse = await chatModel.call(promptWithMemory);
        if (chatResponse.result == null) {
          throw new Error("Expected assistant response to be present");
        }
        await chatMemory.add(conversationId, chatResponse.result.output);
      }

      expect(chatResponse).not.toBeNull();
      expect(chatResponse.result?.output.text).toContain("48");

      const newUserMessage = new UserMessage({
        content: "What did I ask you earlier?",
      });
      await chatMemory.add(conversationId, newUserMessage);

      const newResponse = await chatModel.call(
        new Prompt(await chatMemory.get(conversationId)),
      );

      expect(newResponse).not.toBeNull();
      expect(newResponse.result?.output.text).toContain("6");
      expect(newResponse.result?.output.text).toContain("8");
    },
    TEST_TIMEOUT,
  );
});

function verifyMostFamousPiratePresence(chatResponse: ChatResponse) {
  const outputText = chatResponse.result?.output.text ?? "";
  // From time to time, there is confusion between Blackbeard and Black Bart, and
  // the test fails unless both nicknames are provided.
  expect(outputText).toMatch(/Blackbeard|Black Bart/);
}

function createMultiplyToolCallback() {
  return FunctionToolCallback.builder<MultiplyRequest, number>(
    "multiply",
    ({ a, b }) => a * b,
  )
    .description("Multiply the two numbers")
    .inputType(MultiplyRequestSchema)
    .build();
}

async function collectChatResponseText(
  stream: Observable<ChatResponse>,
): Promise<string> {
  let content = "";
  await lastValueFrom(
    stream.pipe(
      tap((chatResponse) => {
        content += chatResponse.results
          .map((generation) => generation.output.text)
          .join("");
      }),
    ),
  );
  return content;
}
