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
import { beforeEach, describe, expect, it } from "vitest";

import { OllamaApi } from "../api/ollama-api.js";
import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";

describe("OllamaEmbeddingRequest", () => {
  let embeddingModel: OllamaEmbeddingModel;

  beforeEach(() => {
    embeddingModel = new OllamaEmbeddingModel({
      ollamaApi: new OllamaApi({}),
      defaultOptions: new OllamaEmbeddingOptions({
        model: "DEFAULT_MODEL",
        mainGPU: 11,
        useMMap: true,
        numGPU: 1,
      }),
    });
  });

  it("ollama embedding request default options", () => {
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Hello"], null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.model).toBe("DEFAULT_MODEL");
    expect(ollamaRequest.input).toEqual(["Hello"]);
  });

  it("ollama embedding request request options", () => {
    const promptOptions = new OllamaEmbeddingOptions({
      model: "PROMPT_MODEL",
    });

    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Hello"], promptOptions),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.model).toBe("PROMPT_MODEL");
    expect(ollamaRequest.input).toEqual(["Hello"]);
  });

  it("ollama embedding request with negative keep alive", () => {
    const promptOptions = new OllamaEmbeddingOptions({
      model: "PROMPT_MODEL",
      keepAlive: "-1m",
    });

    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Hello"], promptOptions),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.keep_alive).toBe("-1m");
  });

  it("ollama embedding request with empty input", () => {
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest([], null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.input).toHaveLength(0);
    expect(ollamaRequest.model).toBe("DEFAULT_MODEL");
  });

  it("ollama embedding request with multiple inputs", () => {
    const inputs = ["Hello", "World", "How are you?"];
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(inputs, null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.input).toHaveLength(3);
    expect(ollamaRequest.input).toEqual(["Hello", "World", "How are you?"]);
  });

  it("ollama embedding request options override defaults", () => {
    const requestOptions = new OllamaEmbeddingOptions({
      model: "OVERRIDE_MODEL",
    });

    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Override test"], requestOptions),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    // Request options should override defaults
    expect(ollamaRequest.model).toBe("OVERRIDE_MODEL");
  });

  it("ollama embedding request with different keep alive formats", () => {
    // Test seconds format
    const optionsSeconds = new OllamaEmbeddingOptions({ keepAlive: "30s" });
    const requestSeconds = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Test"], optionsSeconds),
    );
    const ollamaRequestSeconds =
      embeddingModel.ollamaEmbeddingRequest(requestSeconds);
    expect(ollamaRequestSeconds.keep_alive).toBe("30s");

    // Test hours format
    const optionsHours = new OllamaEmbeddingOptions({ keepAlive: "2h" });
    const requestHours = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Test"], optionsHours),
    );
    const ollamaRequestHours =
      embeddingModel.ollamaEmbeddingRequest(requestHours);
    expect(ollamaRequestHours.keep_alive).toBe("2h");
  });

  it("ollama embedding request with minimal defaults", () => {
    // Create model with minimal defaults
    const minimalModel = new OllamaEmbeddingModel({
      ollamaApi: new OllamaApi({}),
      defaultOptions: new OllamaEmbeddingOptions({ model: "MINIMAL_MODEL" }),
    });

    const embeddingRequest = minimalModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Minimal test"], null),
    );
    const ollamaRequest = minimalModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.model).toBe("MINIMAL_MODEL");
    expect(ollamaRequest.input).toEqual(["Minimal test"]);
    // Should not have GPU-related options when not set
    expect(ollamaRequest.options?.num_gpu).toBeUndefined();
    expect(ollamaRequest.options?.main_gpu).toBeUndefined();
    expect(ollamaRequest.options?.use_mmap).toBeUndefined();
  });

  it("ollama embedding request preserves input order", () => {
    const orderedInputs = ["First", "Second", "Third", "Fourth"];
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(orderedInputs, null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.input).toEqual(["First", "Second", "Third", "Fourth"]);
  });

  it("ollama embedding request with whitespace inputs", () => {
    const inputs = ["", "   ", "\t\n", "normal text", "  spaced  "];
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(inputs, null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    // Verify that whitespace inputs are preserved as-is
    expect(ollamaRequest.input).toEqual([
      "",
      "   ",
      "\t\n",
      "normal text",
      "  spaced  ",
    ]);
  });

  it("ollama embedding request with null input", () => {
    // Test behavior when input list contains null values
    const inputsWithNull = ["Hello", null, "World"] as unknown as string[];
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(inputsWithNull, null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.input).toEqual(["Hello", null, "World"]);
    expect(ollamaRequest.input).toHaveLength(3);
  });

  it("ollama embedding request partial options override", () => {
    // Test that only specified options are overridden, others remain default
    const requestOptions = new OllamaEmbeddingOptions({
      model: "PARTIAL_OVERRIDE_MODEL",
      numGPU: 5, // Override only numGPU, leave others as default
    });

    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest(["Partial override"], requestOptions),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.model).toBe("PARTIAL_OVERRIDE_MODEL");
    expect(ollamaRequest.options?.num_gpu).toBe(5);
    expect(ollamaRequest.options?.main_gpu).toBe(11);
    expect(ollamaRequest.options?.use_mmap).toBe(true);
  });

  it("ollama embedding request with empty string input", () => {
    // Test with list containing only empty string
    const embeddingRequest = embeddingModel.buildEmbeddingRequest(
      new EmbeddingRequest([""], null),
    );
    const ollamaRequest =
      embeddingModel.ollamaEmbeddingRequest(embeddingRequest);

    expect(ollamaRequest.input).toHaveLength(1);
    expect(ollamaRequest.input[0]).toBe("");
    expect(ollamaRequest.model).toBe("DEFAULT_MODEL");
  });
});
