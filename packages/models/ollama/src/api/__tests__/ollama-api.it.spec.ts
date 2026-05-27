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

import { readFileSync } from "node:fs";

import { lastValueFrom, toArray } from "rxjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "../../__tests__/ollama-test-context.js";
import { OllamaApi } from "../ollama-api.js";
import { OllamaChatOptions } from "../ollama-chat-options.js";
import { OllamaModel } from "../ollama-model.js";

const TEST_TIMEOUT = 600_000;

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaApiIT", () => {
  const chatModel = OllamaModel.QWEN_2_5_3B.name;
  const embeddingModel = OllamaModel.NOMIC_EMBED_TEXT.name;
  const thinkingModel = OllamaModel.QWEN3_4B_THINKING.name;

  let context: OllamaTestContext;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([
      chatModel,
      embeddingModel,
      thinkingModel,
    ]);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "chat",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: chatModel,
        stream: false,
        messages: [
          {
            role: OllamaApi.Message.Role.SYSTEM,
            content: "You are geography teacher. You are talking to a student.",
          },
          {
            role: OllamaApi.Message.Role.USER,
            content:
              "What is the capital of Bulgaria and what is the size? What it the national anthem?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        tools: [],
      };

      const response = await context.api.chat(request);

      expect(response).toBeTruthy();
      expect(response.model).toContain(chatModel);
      expect(response.done).toBe(true);
      expect(response.message.role).toBe(OllamaApi.Message.Role.ASSISTANT);
      expect(response.message.content).toContain("Sofia");
    },
    TEST_TIMEOUT,
  );

  it(
    "json structured output",
    async () => {
      const jsonSchema = JSON.parse(
        readFileSync(new URL("./country-json-schema.json", import.meta.url), {
          encoding: "utf8",
        }),
      );
      const request: OllamaApi.ChatRequest = {
        model: chatModel,
        format: jsonSchema,
        stream: false,
        messages: [
          {
            role: OllamaApi.Message.Role.USER,
            content: "Tell me about Canada.",
          },
        ],
        options: {},
        tools: [],
      };

      const response = await context.api.chat(request);

      expect(response).toBeTruthy();
      expect(response.message).toBeTruthy();
      expect(response.message.role).toBe(OllamaApi.Message.Role.ASSISTANT);
      expect(response.message.content).toBeTruthy();
      expect(JSON.parse(response.message.content ?? "")).toEqual({
        name: "Canada",
        capital: "Ottawa",
        languages: ["English", "French"],
      });
    },
    TEST_TIMEOUT,
  );

  it(
    "streaming chat",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: chatModel,
        stream: true,
        messages: [
          {
            role: OllamaApi.Message.Role.USER,
            content:
              "What is the capital of Bulgaria and what is the size? What it the national anthem?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        tools: [],
      };

      const responses = await lastValueFrom(
        context.api.streamingChat(request).pipe(toArray()),
      );

      expect(responses).toBeTruthy();
      expect(
        responses
          .filter((response) => response.message != null)
          .map((response) => response.message.content ?? "")
          .join("\n"),
      ).toContain("Sofia");

      const lastResponse = responses.at(-1);
      expect(lastResponse?.message.content).toBe("");
      expect(lastResponse?.done).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "embed text",
    async () => {
      const request: OllamaApi.EmbeddingsRequest = {
        model: embeddingModel,
        input: ["I like to eat apples"],
      };

      const response = await context.api.embed(request);

      expect(response).toBeTruthy();
      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toHaveLength(768);
      expect(response.model).toBe(embeddingModel);
      expect(response.prompt_eval_count).toBeGreaterThan(0);
      expect(response.prompt_eval_count).toBeLessThanOrEqual(10);
      expect(response.load_duration).toBeGreaterThan(1);
      expect(response.total_duration).toBeGreaterThan(1);
    },
    TEST_TIMEOUT,
  );

  it(
    "think",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: thinkingModel,
        stream: false,
        messages: [
          {
            role: OllamaApi.Message.Role.SYSTEM,
            content: "You are geography teacher. You are talking to a student.",
          },
          {
            role: OllamaApi.Message.Role.USER,
            content:
              "What is the capital of Bulgaria and what is the size? What it the national anthem?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        think: true,
        tools: [],
      };

      const response = await context.api.chat(request);

      expect(response).toBeTruthy();
      expect(response.model).toContain(thinkingModel);
      expect(response.done).toBe(true);
      expect(response.message.role).toBe(OllamaApi.Message.Role.ASSISTANT);
      expect(response.message.content).toContain("Sofia");
      expect(response.message.thinking).toBeTruthy();
    },
    TEST_TIMEOUT,
  );

  it(
    "chat with thinking",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: thinkingModel,
        stream: true,
        messages: [
          {
            role: OllamaApi.Message.Role.USER,
            content:
              "What is the capital of Bulgaria and what is the size? What it the national anthem?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        think: true,
        tools: [],
      };

      const responses = await lastValueFrom(
        context.api.streamingChat(request).pipe(toArray()),
      );

      expect(responses).toBeTruthy();
      expect(
        responses
          .filter((response) => response.message != null)
          .map((response) => response.message.thinking ?? "")
          .join("\n"),
      ).toContain("Sofia");

      const lastResponse = responses.at(-1);
      expect(lastResponse?.message.content).toBe("");
      expect(lastResponse?.message.thinking == null).toBe(true);
      expect(lastResponse?.done).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "stream chat with thinking",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: thinkingModel,
        stream: true,
        messages: [
          {
            role: OllamaApi.Message.Role.USER,
            content: "What are the planets in the solar system?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        think: true,
        tools: [],
      };

      const responses = await lastValueFrom(
        context.api.streamingChat(request).pipe(toArray()),
      );

      expect(responses).toBeTruthy();
      expect(
        responses
          .filter((response) => response.message != null)
          .map((response) => response.message.thinking ?? "")
          .join("\n"),
      ).toContain("solar");

      const lastResponse = responses.at(-1);
      expect(lastResponse?.message.content).toBe("");
      expect(lastResponse?.message.thinking == null).toBe(true);
      expect(lastResponse?.done).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "stream chat without thinking",
    async () => {
      const request: OllamaApi.ChatRequest = {
        model: thinkingModel,
        stream: true,
        messages: [
          {
            role: OllamaApi.Message.Role.USER,
            content: "What are the planets in the solar system?",
          },
        ],
        options: OllamaChatOptions.builder().temperature(0.9).build().toMap(),
        think: false,
        tools: [],
      };

      const responses = await lastValueFrom(
        context.api.streamingChat(request).pipe(toArray()),
      );

      expect(responses).toBeTruthy();
      expect(
        responses
          .filter((response) => response.message != null)
          .map((response) => response.message.content ?? "")
          .join("\n"),
      ).toContain("Earth");
      expect(
        responses
          .filter((response) => response.message != null)
          .every((response) => response.message.thinking == null),
      ).toBe(true);

      const lastResponse = responses.at(-1);
      expect(lastResponse?.message.content).toBe("");
      expect(lastResponse?.message.thinking == null).toBe(true);
      expect(lastResponse?.done).toBe(true);
    },
    TEST_TIMEOUT,
  );
});
