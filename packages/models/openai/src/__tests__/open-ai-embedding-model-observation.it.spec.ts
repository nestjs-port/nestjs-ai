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
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { OpenAiEmbeddingModel } from "../open-ai-embedding-model";
import { OpenAiEmbeddingOptions } from "../open-ai-embedding-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiEmbeddingModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let embeddingModel: OpenAiEmbeddingModel;

  beforeEach(() => {
    observationRegistry = TestObservationRegistry.create();
    embeddingModel = new OpenAiEmbeddingModel({
      options: new OpenAiEmbeddingOptions({
        apiKey: OPENAI_API_KEY,
        model: OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL,
      }),
      observationRegistry,
    });

    observationRegistry.clear();
  });

  it("observation for embedding operation", async () => {
    const options = OpenAiEmbeddingOptions.builder()
      .model("text-embedding-3-small")
      .dimensions(1536)
      .build();

    const embeddingRequest = new EmbeddingRequest(
      ["Here comes the sun"],
      options,
    );

    const embeddingResponse = await embeddingModel.call(embeddingRequest);
    expect(embeddingResponse.results).not.toHaveLength(0);

    const responseMetadata = embeddingResponse.metadata;
    expect(responseMetadata).toBeDefined();

    expect(observationRegistry.currentObservation).toBeNull();

    const observation = observationRegistry.contexts.find(
      (entry) =>
        entry.context.name ===
        DefaultEmbeddingModelObservationConvention.DEFAULT_NAME,
    );
    expect(observation).toBeDefined();
    if (observation == null) {
      throw new Error("Expected observation context to be present");
    }

    const context = observation.context;
    const low = context.lowCardinalityKeyValues;
    const high = context.highCardinalityKeyValues;

    expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
      AiOperationType.EMBEDDING.value,
    );
    expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
      AiProvider.OPENAI.value,
    );
    expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(
      "text-embedding-3-small",
    );
    expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
      responseMetadata.model,
    );
    expect(
      high.get(AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value),
    ).toBe("1536");
    expect(high.get(AiObservationAttributes.USAGE_INPUT_TOKENS.value)).toBe(
      String(responseMetadata.usage.promptTokens),
    );
    expect(high.get(AiObservationAttributes.USAGE_TOTAL_TOKENS.value)).toBe(
      String(responseMetadata.usage.totalTokens),
    );

    expect(observation.isObservationStarted).toBe(true);
    expect(observation.isObservationStopped).toBe(true);
  });
});
