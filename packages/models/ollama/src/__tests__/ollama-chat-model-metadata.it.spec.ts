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

import { Prompt } from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-port/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_3_06B.name;

/**
 * ITs for {@link OllamaChatModel} asserting AI metadata.
 */
describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaChatModelMetadataIT", () => {
  let context: OllamaTestContext;
  let observationRegistry: TestObservationRegistry;
  let chatModel: OllamaChatModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    observationRegistry = TestObservationRegistry.create();
    chatModel = new OllamaChatModel({
      ollamaApi: context.api,
      observationRegistry: observationRegistry as never,
    });
  }, TEST_TIMEOUT);

  beforeEach(() => {
    observationRegistry.clear();
  });

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "ollama thinking metadata captured",
    async () => {
      const options = OllamaChatOptions.builder()
        .model(MODEL)
        .enableThinking()
        .build();

      const prompt = new Prompt("Why is the sky blue?", options);

      const chatResponse = await chatModel.call(prompt);
      expect(chatResponse.result?.output.text ?? "").not.toHaveLength(0);

      for (const generation of chatResponse.results) {
        const chatGenerationMetadata = generation.metadata;
        expect(chatGenerationMetadata).not.toBeNull();
        expect(chatGenerationMetadata.containsKey("thinking")).toBe(true);
      }
    },
    TEST_TIMEOUT,
  );

  it(
    "ollama thinking metadata not captured when set think flag to false",
    async () => {
      // Note: Thinking-capable models (e.g., qwen3:*) auto-enable thinking by default
      // in Ollama 0.12+.
      // This test explicitly disables thinking to verify null metadata is returned.
      const options = OllamaChatOptions.builder()
        .model(MODEL)
        .disableThinking()
        .build();

      const prompt = new Prompt("Why is the sky blue?", options);

      const chatResponse = await chatModel.call(prompt);
      expect(chatResponse.result?.output.text ?? "").not.toHaveLength(0);

      for (const generation of chatResponse.results) {
        const chatGenerationMetadata = generation.metadata;
        expect(chatGenerationMetadata).not.toBeNull();
        const thinking = chatGenerationMetadata.get("thinking");
        expect(thinking).toBeNull();
      }
    },
    TEST_TIMEOUT,
  );

  it(
    "ollama thinking metadata captured in streaming",
    async () => {
      const options = OllamaChatOptions.builder()
        .model(MODEL)
        .enableThinking()
        .build();
      const prompt = new Prompt("Why is the sky blue?", options);
      const responses = await firstValueFrom(
        chatModel.stream(prompt).pipe(toArray()),
      );
      expect(responses).not.toHaveLength(0);

      // At least one response should contain thinking metadata
      const hasThinkingMetadata = responses
        .flatMap((response) => response.results)
        .map((generation) => generation.metadata)
        .some(
          (metadata) => metadata != null && metadata.containsKey("thinking"),
        );

      expect(hasThinkingMetadata).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "ollama thinking metadata not captured in streaming when set think flag to false",
    async () => {
      // Note: Thinking-capable models (e.g., qwen3:*) auto-enable thinking by default
      // in Ollama 0.12+.
      // This test explicitly disables thinking to verify null metadata is returned.
      const options = OllamaChatOptions.builder()
        .model(MODEL)
        .disableThinking()
        .build();

      const prompt = new Prompt("Why is the sky blue?", options);
      const responses = await firstValueFrom(
        chatModel.stream(prompt).pipe(toArray()),
      );
      expect(responses).not.toHaveLength(0);

      // No response should contain thinking metadata
      const hasThinkingMetadata = responses
        .flatMap((response) => response.results)
        .map((generation) => generation.metadata)
        .some(
          (metadata) => metadata != null && metadata.containsKey("thinking"),
        );

      expect(hasThinkingMetadata).toBe(false);
    },
    TEST_TIMEOUT,
  );
});
