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
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN3_EMBED_8B.name;

describe("OllamaEmbeddingOptionsTestsIT", () => {
  let context: OllamaTestContext | null = null;
  let embeddingModel: OllamaEmbeddingModel | null = null;

  beforeAll(async () => {
    if (!OLLAMA_TESTS_ENABLED) {
      return;
    }

    context = await OllamaTestContext.initializeOllama([MODEL]);
    embeddingModel = new OllamaEmbeddingModel({
      ollamaApi: context.api,
      defaultOptions: new OllamaEmbeddingOptions({ model: MODEL }),
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it("test dimensions option", () => {
    // Test setting and getting dimensions parameter
    const expectedDimensions = 1024;

    const options = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: expectedDimensions,
    });

    expect(options.dimensions).toBe(expectedDimensions);
    expect(options.model).toBe(MODEL);
  });

  it("test dimensions option with setter", () => {
    // Test setting dimensions parameter using setter method
    const expectedDimensions = 768;

    const options = new OllamaEmbeddingOptions();
    options.dimensions = expectedDimensions;
    options.model = MODEL;

    expect(options.dimensions).toBe(expectedDimensions);
    expect(options.model).toBe(MODEL);
  });

  it("test dimensions option in from options", () => {
    // Test if fromOptions method correctly copies dimensions parameter
    const expectedDimensions = 512;

    const originalOptions = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: expectedDimensions,
    });

    const copiedOptions = OllamaEmbeddingOptions.fromOptions(originalOptions);

    expect(copiedOptions.dimensions).toBe(expectedDimensions);
    expect(copiedOptions.model).toBe(MODEL);
  });

  it("test dimensions option in equals and hash code", () => {
    // Test the impact of dimensions parameter in equals and hashCode methods
    const dimensions1 = 1024;
    const dimensions2 = 768;

    const options1 = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: dimensions1,
    });

    const options2 = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: dimensions1,
    });

    const options3 = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: dimensions2,
    });

    // Same dimensions should be equal
    expect(options1).toEqual(options2);

    // Different dimensions should not be equal
    expect(options1).not.toEqual(options3);
  });

  it("test dimensions option null", () => {
    // Test dimensions parameter when it's null
    const options = new OllamaEmbeddingOptions({ model: MODEL });

    expect(options.dimensions).toBeNull();
  });

  it("test dimensions option with to map", () => {
    // Test dimensions parameter in toMap method, which validates parameter
    // serialization to API call
    const expectedDimensions = 1536;

    const options = new OllamaEmbeddingOptions({
      model: MODEL,
      dimensions: expectedDimensions,
    });

    const optionsMap = options.toMap();

    // Verify dimensions parameter is included in serialized map
    expect(optionsMap).toHaveProperty("dimensions");
    expect(optionsMap.dimensions).toBe(expectedDimensions);

    // Verify map is not empty, indicating parameters will be passed to API
    expect(Object.keys(optionsMap)).not.toHaveLength(0);
  });

  it.skipIf(!OLLAMA_TESTS_ENABLED)(
    "test dimensions parameter with real embedding",
    async () => {
      // Test actual vector model call to verify dimensions parameter is effectively
      // passed
      const testText = "Yokior";
      const customDimensions = 512;

      // Create options with dimensions parameter
      const optionsWithDimensions = new OllamaEmbeddingOptions({
        model: MODEL,
        dimensions: customDimensions,
      });

      // Call embedding model
      const request = new EmbeddingRequest([testText], optionsWithDimensions);
      const response = await embeddingModel?.call(request);

      // Verify response
      expect(response).toBeTruthy();
      expect(response?.results).toHaveLength(1);
      expect(response?.results[0].output.length).toBeGreaterThan(0);

      // Get actual vector dimensions
      const embeddingVector = response?.results[0].output;
      const actualDimensions = embeddingVector?.length;

      // Verify response basic information
      expect(response?.metadata.model).toBe(MODEL);

      // Verify vector dimensions
      expect(actualDimensions).toBe(customDimensions);
    },
    TEST_TIMEOUT,
  );

  it.skipIf(!OLLAMA_TESTS_ENABLED)(
    "test dimensions parameter comparison",
    async () => {
      // Compare scenarios with and without dimensions parameter
      const testText = "Spring AI is awesome - 2026.01.02";

      // Without dimensions parameter
      const optionsWithoutDimensions = new OllamaEmbeddingOptions({
        model: MODEL,
      });

      const requestWithoutDimensions = new EmbeddingRequest(
        [testText],
        optionsWithoutDimensions,
      );
      const responseWithoutDimensions = await embeddingModel?.call(
        requestWithoutDimensions,
      );

      // With dimensions parameter
      const optionsWithDimensions = new OllamaEmbeddingOptions({
        model: MODEL,
        dimensions: 1024,
      });

      const requestWithDimensions = new EmbeddingRequest(
        [testText],
        optionsWithDimensions,
      );
      const responseWithDimensions = await embeddingModel?.call(
        requestWithDimensions,
      );

      // Verify both responses are valid
      expect(responseWithoutDimensions?.results).toHaveLength(1);
      expect(responseWithDimensions?.results).toHaveLength(1);

      const vectorWithoutDimensions =
        responseWithoutDimensions?.results[0].output;
      const vectorWithDimensions = responseWithDimensions?.results[0].output;

      // Verify vector dimension information
      expect(vectorWithoutDimensions?.length).toBeGreaterThan(0);
      expect(vectorWithDimensions?.length).toBeGreaterThan(0);

      // Vector dimensions should be different
      expect(vectorWithoutDimensions?.length).not.toBe(
        vectorWithDimensions?.length,
      );

      // qwen3-embedding:8b default dimension is 4096
      expect(vectorWithoutDimensions?.length).toBe(4096);
      expect(vectorWithDimensions?.length).toBe(1024);
    },
    TEST_TIMEOUT,
  );
});
