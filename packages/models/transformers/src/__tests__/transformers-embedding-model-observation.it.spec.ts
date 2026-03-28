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
  EmbeddingOptions,
  EmbeddingRequest,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TransformersEmbeddingModel } from "../transformers-embedding-model";

describe("TransformersEmbeddingModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let embeddingModel: TransformersEmbeddingModel;

  beforeAll(async () => {
    observationRegistry = TestObservationRegistry.create();
    embeddingModel = new TransformersEmbeddingModel({
      observationRegistry,
    });
    await embeddingModel.onModuleInit();
  }, 240_000);

  it("observation for embedding operation", async () => {
    const options = EmbeddingOptions.builder()
      .model("bert-base-uncased")
      .build();
    const embeddingRequest = new EmbeddingRequest(
      ["Here comes the sun"],
      options,
    );

    const embeddingResponse = await embeddingModel.call(embeddingRequest);
    expect(embeddingResponse.results).not.toHaveLength(0);
    expect(embeddingResponse.metadata).toBeDefined();

    expect(observationRegistry.currentObservation).toBeNull();
    expect(observationRegistry.contexts).toHaveLength(1);

    const observation = observationRegistry.contexts[0];
    expect(observation.context.name).toBe(
      DefaultEmbeddingModelObservationConvention.DEFAULT_NAME,
    );

    const context = observation.context;
    const low = context.lowCardinalityKeyValues;
    const high = context.highCardinalityKeyValues;

    expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
      AiOperationType.EMBEDDING.value,
    );
    expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
      AiProvider.ONNX.value,
    );
    expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(
      "bert-base-uncased",
    );
    expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
      TransformersEmbeddingModel.DEFAULT_MODEL,
    );
    expect(
      high.get(AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value),
    ).toBeUndefined();
    expect(high.get(AiObservationAttributes.USAGE_INPUT_TOKENS.value)).toBe(
      "0",
    );
    expect(high.get(AiObservationAttributes.USAGE_TOTAL_TOKENS.value)).toBe(
      "0",
    );

    expect(observation.isObservationStarted).toBe(true);
    expect(observation.isObservationStopped).toBe(true);
  });
}, 240_000);
