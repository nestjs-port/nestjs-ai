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

import { Test, type TestingModule } from "@nestjs/testing";
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import { EmbeddingRequest } from "@nestjs-ai/model";
import { ms } from "@nestjs-port/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaEmbeddingOptions } from "../../api/ollama-embedding-options.js";
import { OllamaModel } from "../../api/ollama-model.js";
import type { OllamaEmbeddingModel } from "../../ollama-embedding-model.js";
import { OllamaModelManager } from "../../management/ollama-model-manager.js";
import { PullModelStrategy } from "../../management/pull-model-strategy.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "../../__tests__/ollama-test-context.js";
import { OllamaApiModule } from "../ollama-api.module.js";
import { OllamaEmbeddingModelModule } from "../ollama-embedding-model.module.js";
import type { OllamaEmbeddingProperties } from "../ollama-embedding-properties.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.NOMIC_EMBED_TEXT.name;
const ADDITIONAL_MODEL = "all-minilm";

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaEmbeddingModelModuleIT", () => {
  let context: OllamaTestContext;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    const modelManager = new OllamaModelManager({ ollamaApi: context.api });
    await modelManager.deleteModel(ADDITIONAL_MODEL);
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "single text embedding",
    async () => {
      const embeddingModel = await createEmbeddingModel(context, {
        options: { model: MODEL },
      });

      const embeddingResponse = await embeddingModel.call(
        new EmbeddingRequest(
          ["Hello World"],
          new OllamaEmbeddingOptions({ model: MODEL }),
        ),
      );

      expect(embeddingResponse.results).toHaveLength(1);
      expect(embeddingResponse.results[0].output).not.toHaveLength(0);
      await expect(embeddingModel.dimensions()).resolves.toBe(768);
    },
    TEST_TIMEOUT,
  );

  it(
    "embedding with pull",
    async () => {
      const model = ADDITIONAL_MODEL;
      const embeddingModel = await createEmbeddingModel(context, {
        include: true,
        additionalModels: [ADDITIONAL_MODEL],
        pullModelStrategy: PullModelStrategy.WHEN_MISSING,
        timeout: ms(TEST_TIMEOUT),
        maxRetries: 2,
        options: { model },
      });

      const modelManager = new OllamaModelManager({ ollamaApi: context.api });
      await waitForCondition(
        () => modelManager.isModelAvailable(ADDITIONAL_MODEL),
        TEST_TIMEOUT,
      );

      const embeddingResponse = await embeddingModel.call(
        new EmbeddingRequest(
          ["Hello World"],
          new OllamaEmbeddingOptions({ model }),
        ),
      );

      expect(embeddingResponse.results).toHaveLength(1);
      expect(embeddingResponse.results[0].output).not.toHaveLength(0);
      expect(embeddingResponse.metadata.model).toContain(ADDITIONAL_MODEL);
      await expect(embeddingModel.dimensions()).resolves.toBe(768);

      await modelManager.deleteModel(model);
    },
    TEST_TIMEOUT,
  );

  it(
    "module registration",
    async () => {
      const moduleRef = await createEmbeddingModule(context, {
        options: { model: MODEL },
      });

      expect(moduleRef.get(EMBEDDING_MODEL_TOKEN)).toBeTruthy();

      const embeddingModel = moduleRef.get<OllamaEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      const embeddingResponse = await embeddingModel.call(
        new EmbeddingRequest(
          ["Hello World"],
          new OllamaEmbeddingOptions({ model: MODEL }),
        ),
      );

      expect(embeddingResponse.results).toHaveLength(1);
      expect(embeddingResponse.results[0].output).not.toHaveLength(0);
    },
    TEST_TIMEOUT,
  );
});

async function createEmbeddingModule(
  context: OllamaTestContext,
  properties: OllamaEmbeddingProperties,
): Promise<TestingModule> {
  const apiModule = OllamaApiModule.forFeature({
    baseUrl: context.baseUrl,
  });

  return Test.createTestingModule({
    imports: [
      OllamaEmbeddingModelModule.forFeature(properties, {
        imports: [apiModule],
      }),
    ],
  }).compile();
}

async function createEmbeddingModel(
  context: OllamaTestContext,
  properties: OllamaEmbeddingProperties,
): Promise<OllamaEmbeddingModel> {
  const moduleRef = await createEmbeddingModule(context, properties);
  return moduleRef.get<OllamaEmbeddingModel>(EMBEDDING_MODEL_TOKEN);
}

async function waitForCondition(
  predicate: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out after ${timeoutMs}ms`);
}
