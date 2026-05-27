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

import { EmbeddingRequest } from "@nestjs-ai/model";
import { ms } from "@nestjs-port/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { ModelManagementOptions } from "../management/model-management-options.js";
import { OllamaModelManager } from "../management/ollama-model-manager.js";
import { PullModelStrategy } from "../management/pull-model-strategy.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";
import { OllamaTestContext } from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.NOMIC_EMBED_TEXT.name;
const ADDITIONAL_MODEL = "all-minilm";

describe("OllamaEmbeddingModelIT", () => {
  let context: OllamaTestContext;
  let embeddingModel: OllamaEmbeddingModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    embeddingModel = new OllamaEmbeddingModel({
      ollamaApi: context.api,
      defaultOptions: new OllamaEmbeddingOptions({ model: MODEL }),
      modelManagementOptions: new ModelManagementOptions({
        pullModelStrategy: PullModelStrategy.WHEN_MISSING,
        additionalModels: [ADDITIONAL_MODEL],
        timeout: ms(TEST_TIMEOUT),
        maxRetries: 2,
      }),
    });

    await embeddingModel.dimensions();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    const modelManager = new OllamaModelManager({ ollamaApi: context.api });
    await modelManager.deleteModel(ADDITIONAL_MODEL);
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "embeddings",
    async () => {
      expect(embeddingModel).toBeTruthy();
      const embeddingResponse = await embeddingModel.call(
        new EmbeddingRequest(
          ["Hello World", "Something else"],
          new OllamaEmbeddingOptions(),
        ),
      );
      expect(embeddingResponse.results).toHaveLength(2);
      expect(embeddingResponse.results[0].index).toBe(0);
      expect(embeddingResponse.results[0].output.length).toBeGreaterThan(0);
      expect(embeddingResponse.results[1].index).toBe(1);
      expect(embeddingResponse.results[1].output.length).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.model).toBe(MODEL);
      // Token count varies by Ollama version and tokenizer implementation
      expect(embeddingResponse.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.usage.promptTokens).toBeLessThanOrEqual(
        10,
      );
      expect(embeddingResponse.metadata.usage.totalTokens).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.usage.totalTokens).toBeLessThanOrEqual(
        10,
      );

      await expect(embeddingModel.dimensions()).resolves.toBe(768);
    },
    TEST_TIMEOUT,
  );

  it(
    "auto pull model at startup time",
    async () => {
      const model = "all-minilm";
      expect(embeddingModel).toBeTruthy();

      const modelManager = new OllamaModelManager({ ollamaApi: context.api });
      await expect(
        modelManager.isModelAvailable(ADDITIONAL_MODEL),
      ).resolves.toBe(true);

      const embeddingResponse = await embeddingModel.call(
        new EmbeddingRequest(
          ["Hello World", "Something else"],
          new OllamaEmbeddingOptions({ model }),
        ),
      );

      expect(embeddingResponse.results).toHaveLength(2);
      expect(embeddingResponse.results[0].index).toBe(0);
      expect(embeddingResponse.results[0].output.length).toBeGreaterThan(0);
      expect(embeddingResponse.results[1].index).toBe(1);
      expect(embeddingResponse.results[1].output.length).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.model).toContain(ADDITIONAL_MODEL);
      // Token count varies by Ollama version and tokenizer implementation
      expect(embeddingResponse.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.usage.promptTokens).toBeLessThanOrEqual(
        20,
      );
      expect(embeddingResponse.metadata.usage.totalTokens).toBeGreaterThan(0);
      expect(embeddingResponse.metadata.usage.totalTokens).toBeLessThanOrEqual(
        20,
      );

      await expect(embeddingModel.dimensions()).resolves.toBe(768);
    },
    TEST_TIMEOUT,
  );
});
