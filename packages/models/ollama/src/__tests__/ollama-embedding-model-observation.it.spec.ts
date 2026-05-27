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

import {
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import {
  DefaultEmbeddingModelObservationConvention,
  EmbeddingRequest,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-port/testing";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";

import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";
import { OllamaTestContext } from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.NOMIC_EMBED_TEXT.name;

describe("OllamaEmbeddingModelObservationIT", () => {
  let context: OllamaTestContext;
  let observationRegistry: TestObservationRegistry;
  let embeddingModel: OllamaEmbeddingModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    observationRegistry = TestObservationRegistry.create();
    embeddingModel = new OllamaEmbeddingModel({
      ollamaApi: context.api,
      observationRegistry: observationRegistry as never,
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "observation for embedding operation",
    async () => {
      const options = new OllamaEmbeddingOptions({ model: MODEL });

      const embeddingRequest = new EmbeddingRequest(
        ["Here comes the sun"],
        options,
      );

      const embeddingResponse = await embeddingModel.call(embeddingRequest);
      expect(embeddingResponse.results).not.toHaveLength(0);

      const responseMetadata = embeddingResponse.metadata;
      assert.exists(responseMetadata);

      expect(observationRegistry.currentObservation).toBeNull();

      const observation = observationRegistry.contexts.find(
        (entry) =>
          entry.context.name ===
          DefaultEmbeddingModelObservationConvention.DEFAULT_NAME,
      );
      assert.exists(observation);
      if (observation == null) {
        throw new Error("Expected observation context to be present");
      }

      const context = observation.context;
      const low = context.lowCardinalityKeyValues;
      const high = context.highCardinalityKeyValues;

      expect(context.contextualName).toBe(`embedding ${MODEL}`);
      expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
        AiOperationType.EMBEDDING.value,
      );
      expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
        AiProvider.OLLAMA.value,
      );
      expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(MODEL);
      expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
        responseMetadata.model,
      );
      expect(
        high.get(AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value),
      ).toBeUndefined();
      expect(high.get(AiObservationAttributes.USAGE_INPUT_TOKENS.value)).toBe(
        String(responseMetadata.usage.promptTokens),
      );
      expect(high.get(AiObservationAttributes.USAGE_TOTAL_TOKENS.value)).toBe(
        String(responseMetadata.usage.totalTokens),
      );
      expect(observation.isObservationStarted).toBe(true);
      expect(observation.isObservationStopped).toBe(true);
    },
    TEST_TIMEOUT,
  );
});
