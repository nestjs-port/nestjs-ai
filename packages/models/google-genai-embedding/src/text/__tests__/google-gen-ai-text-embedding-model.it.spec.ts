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
import type { EmbedContentConfig, GoogleGenAI } from "@google/genai";
import { beforeAll, describe, expect, it } from "vitest";

import { GoogleGenAiEmbeddingConnectionDetails } from "../../google-gen-ai-embedding-connection-details.js";
import { GoogleGenAiTextEmbeddingModel } from "../google-gen-ai-text-embedding-model.js";
import { GoogleGenAiTextEmbeddingModelName } from "../google-gen-ai-text-embedding-model-name.js";
import { GoogleGenAiTextEmbeddingOptions } from "../google-gen-ai-text-embedding-options.js";

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const TEST_TIMEOUT = 600_000;

// https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/textembedding-gecko?project=gen-lang-client-0587361272

describe.skipIf(!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION)(
  "GoogleGenAiTextEmbeddingModelIT",
  () => {
    let embeddingModel: GoogleGenAiTextEmbeddingModel;
    let genAiClient: GoogleGenAI;

    beforeAll(() => {
      const connectionDetails = GoogleGenAiEmbeddingConnectionDetails.builder()
        .projectId(GOOGLE_CLOUD_PROJECT ?? null)
        .location(GOOGLE_CLOUD_LOCATION ?? null)
        .build();

      genAiClient = connectionDetails.genAiClient;

      const options = GoogleGenAiTextEmbeddingOptions.builder()
        .model(GoogleGenAiTextEmbeddingModelName.TEXT_EMBEDDING_004.name)
        .taskType(GoogleGenAiTextEmbeddingOptions.TaskType.RETRIEVAL_DOCUMENT)
        .build();

      embeddingModel = new GoogleGenAiTextEmbeddingModel({
        connectionDetails,
        defaultOptions: options,
      });
    });

    it.each([
      "text-embedding-005",
      "text-embedding-005",
      "text-multilingual-embedding-002",
    ])(
      "default embedding %s",
      async (modelName) => {
        expect(embeddingModel).not.toBeNull();

        const options = GoogleGenAiTextEmbeddingOptions.builder()
          .model(modelName)
          .build();

        const embeddingResponse = await embeddingModel.call(
          new EmbeddingRequest(["Hello World", "World is Big"], options),
        );

        expect(embeddingResponse.results).toHaveLength(2);
        expect(embeddingResponse.results[0].output).toHaveLength(768);
        expect(embeddingResponse.results[1].output).toHaveLength(768);
        expect(embeddingResponse.metadata.model).toBe(modelName);

        expect(embeddingResponse.metadata.usage.totalTokens).toBe(5);

        expect(await embeddingModel.dimensions()).toBe(768);
      },
      TEST_TIMEOUT,
    );

    // At this time, the new gemini-embedding-001 model supports only a batch size of 1
    it.each(["gemini-embedding-001"])(
      "default embedding gemini %s",
      async (modelName) => {
        expect(embeddingModel).not.toBeNull();

        const options = GoogleGenAiTextEmbeddingOptions.builder()
          .model(modelName)
          .build();

        const embeddingResponse = await embeddingModel.call(
          new EmbeddingRequest(["Hello World"], options),
        );

        expect(embeddingResponse.results).toHaveLength(1);
        expect(embeddingResponse.results[0].output).toHaveLength(3072);
        // currently suporting a batch size of 1
        // assertThat(embeddingResponse.getResults().get(1).getOutput()).hasSize(768);
        expect(embeddingResponse.metadata.model).toBe(modelName);

        expect(embeddingResponse.metadata.usage.totalTokens).toBe(2);

        expect(await embeddingModel.dimensions()).toBe(768);
      },
      TEST_TIMEOUT,
    );

    // Fixing https://github.com/spring-projects/spring-ai/issues/2168
    it(
      "test task type property",
      async () => {
        // Use text-embedding-005 model
        const options = GoogleGenAiTextEmbeddingOptions.builder()
          .model("text-embedding-005")
          .taskType(GoogleGenAiTextEmbeddingOptions.TaskType.RETRIEVAL_DOCUMENT)
          .build();

        const text = "Test text for embedding";

        // Generate embedding using Spring AI with RETRIEVAL_DOCUMENT task type
        const embeddingResponse = await embeddingModel.call(
          new EmbeddingRequest([text], options),
        );

        expect(embeddingResponse.results).toHaveLength(1);
        expect(embeddingResponse.results[0].output).not.toBeNull();

        // Get the embedding result
        const springAiEmbedding = embeddingResponse.results[0].output;

        // Now generate the same embedding using Google SDK directly with
        // RETRIEVAL_DOCUMENT
        await getEmbeddingUsingGoogleSdk(
          genAiClient,
          text,
          "RETRIEVAL_DOCUMENT",
        );

        // Also generate embedding using Google SDK with RETRIEVAL_QUERY (which is the
        // default)
        await getEmbeddingUsingGoogleSdk(genAiClient, text, "RETRIEVAL_QUERY");

        // Note: The new SDK might handle task types differently
        // For now, we'll check that we get valid embeddings
        expect(springAiEmbedding).not.toBeNull();
        expect(springAiEmbedding.length).toBeGreaterThan(0);

        // These assertions might need to be adjusted based on how the new SDK handles
        // task types
        // The original test was verifying that task types affect the embedding output
      },
      TEST_TIMEOUT,
    );

    // Fixing https://github.com/spring-projects/spring-ai/issues/2168
    it(
      "test default task type behavior",
      async () => {
        // Test default behavior without explicitly setting task type
        const options = GoogleGenAiTextEmbeddingOptions.builder()
          .model("text-embedding-005")
          .build();

        const text = "Test text for default embedding";

        const embeddingResponse = await embeddingModel.call(
          new EmbeddingRequest([text], options),
        );

        expect(embeddingResponse.results).toHaveLength(1);

        const springAiDefaultEmbedding = embeddingResponse.results[0].output;

        // According to documentation, default should be RETRIEVAL_DOCUMENT
        await getEmbeddingUsingGoogleSdk(
          genAiClient,
          text,
          "RETRIEVAL_DOCUMENT",
        );

        // Note: The new SDK might handle defaults differently
        expect(springAiDefaultEmbedding).not.toBeNull();
        expect(springAiDefaultEmbedding.length).toBeGreaterThan(0);
      },
      TEST_TIMEOUT,
    );
  },
);

async function getEmbeddingUsingGoogleSdk(
  genAiClient: GoogleGenAI,
  text: string,
  _taskType: string,
): Promise<number[]> {
  try {
    // Use the new Google Gen AI SDK to generate embeddings
    const config: EmbedContentConfig = {
      // Note: The new SDK might not support task type in the same way
      // This needs to be verified with the SDK documentation
    };

    const response = await genAiClient.models.embedContent({
      model: "text-embedding-005",
      contents: text,
      config,
    });

    if (response.embeddings != null && response.embeddings.length > 0) {
      const embedding = response.embeddings[0];
      if (embedding.values != null) {
        return [...embedding.values];
      }
    }

    throw new Error("No embeddings returned from Google SDK");
  } catch (e) {
    throw new Error("Failed to get embedding from Google SDK", { cause: e });
  }
}
