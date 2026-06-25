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
import { RetryUtils } from "@nestjs-ai/retry";
import { TestObservationRegistry } from "@nestjs-port/testing";
import { assert, beforeAll, describe, expect, it } from "vitest";

import { GoogleGenAiEmbeddingConnectionDetails } from "../../google-gen-ai-embedding-connection-details.js";
import { GoogleGenAiTextEmbeddingModel } from "../google-gen-ai-text-embedding-model.js";
import { GoogleGenAiTextEmbeddingModelName } from "../google-gen-ai-text-embedding-model-name.js";
import { GoogleGenAiTextEmbeddingOptions } from "../google-gen-ai-text-embedding-options.js";

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const TEST_TIMEOUT = 600_000;

describe.skipIf(!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION)(
  "GoogleGenAiTextEmbeddingModelObservationIT",
  () => {
    let observationRegistry: TestObservationRegistry;
    let embeddingModel: GoogleGenAiTextEmbeddingModel;

    beforeAll(() => {
      observationRegistry = TestObservationRegistry.create();

      const connectionDetails = GoogleGenAiEmbeddingConnectionDetails.builder()
        .projectId(GOOGLE_CLOUD_PROJECT ?? null)
        .location(GOOGLE_CLOUD_LOCATION ?? null)
        .build();

      const options = GoogleGenAiTextEmbeddingOptions.builder()
        .model(GoogleGenAiTextEmbeddingOptions.DEFAULT_MODEL_NAME)
        .build();

      embeddingModel = new GoogleGenAiTextEmbeddingModel({
        connectionDetails,
        defaultOptions: options,
        retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
        observationRegistry: observationRegistry as never,
      });
    });

    it(
      "observation for embedding operation",
      async () => {
        const options = GoogleGenAiTextEmbeddingOptions.builder()
          .model(GoogleGenAiTextEmbeddingModelName.TEXT_EMBEDDING_004.name)
          .dimensions(768)
          .build();

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

        expect(context.contextualName).toBe(
          `embedding ${GoogleGenAiTextEmbeddingModelName.TEXT_EMBEDDING_004.name}`,
        );
        expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
          AiOperationType.EMBEDDING.value,
        );
        expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
          AiProvider.GOOGLE_GENAI_AI.value,
        );
        expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(
          GoogleGenAiTextEmbeddingModelName.TEXT_EMBEDDING_004.name,
        );
        expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
          responseMetadata.model,
        );
        expect(
          high.get(AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value),
        ).toBe("768");
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
  },
);
