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

import { EmbeddingOptions, EmbeddingRequest } from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";

import type { OllamaApi } from "../api/ollama-api.js";
import { OllamaEmbeddingOptions } from "../api/ollama-embedding-options.js";
import { OllamaEmbeddingModel } from "../ollama-embedding-model.js";

describe("OllamaEmbeddingModel", () => {
  it("options", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed
      .mockResolvedValueOnce({
        model: "RESPONSE_MODEL_NAME",
        embeddings: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0,
      })
      .mockResolvedValueOnce({
        model: "RESPONSE_MODEL_NAME2",
        embeddings: [
          [7, 8, 9],
          [10, 11, 12],
        ],
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0,
      });

    const defaultOptions = new OllamaEmbeddingOptions({
      model: "DEFAULT_MODEL",
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions,
    });

    let response = await embeddingModel.call(
      new EmbeddingRequest(
        ["Input1", "Input2", "Input3"],
        EmbeddingOptions.builder().build(),
      ),
    );

    expect(response.results).toHaveLength(2);
    expect(response.results[0].index).toBe(0);
    expect(response.results[0].output).toEqual([1, 2, 3]);
    expect(response.results[1].index).toBe(1);
    expect(response.results[1].output).toEqual([4, 5, 6]);
    expect(response.metadata.model).toBe("RESPONSE_MODEL_NAME");

    let embeddingsRequest = ollamaApi.embed.mock.calls.at(-1)?.[0];
    expect(embeddingsRequest?.keep_alive).toBeNull();
    expect(embeddingsRequest?.truncate).toBeNull();
    expect(embeddingsRequest?.input).toEqual(["Input1", "Input2", "Input3"]);
    expect(embeddingsRequest?.options).toEqual({});
    expect(embeddingsRequest?.model).toBe("DEFAULT_MODEL");

    const runtimeOptions = new OllamaEmbeddingOptions({
      model: "RUNTIME_MODEL",
    });

    response = await embeddingModel.call(
      new EmbeddingRequest(["Input4", "Input5", "Input6"], runtimeOptions),
    );

    expect(response.results).toHaveLength(2);
    expect(response.results[0].index).toBe(0);
    expect(response.results[0].output).toEqual([7, 8, 9]);
    expect(response.results[1].index).toBe(1);
    expect(response.results[1].output).toEqual([10, 11, 12]);
    expect(response.metadata.model).toBe("RESPONSE_MODEL_NAME2");

    embeddingsRequest = ollamaApi.embed.mock.calls.at(-1)?.[0];
    expect(embeddingsRequest?.input).toEqual(["Input4", "Input5", "Input6"]);
    expect(embeddingsRequest?.model).toBe("RUNTIME_MODEL");
  });

  it("single input embedding", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "TEST_MODEL",
      embeddings: [[0.1, 0.2, 0.3]],
      total_duration: 10,
      load_duration: 5,
      prompt_eval_count: 1,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({ model: "TEST_MODEL" }),
    });

    const response = await embeddingModel.call(
      new EmbeddingRequest(
        ["Single input text"],
        EmbeddingOptions.builder().build(),
      ),
    );

    expect(response.results).toHaveLength(1);
    expect(response.results[0].index).toBe(0);
    expect(response.results[0].output).toEqual([0.1, 0.2, 0.3]);
    expect(response.metadata.model).toBe("TEST_MODEL");

    const embeddingsRequest = ollamaApi.embed.mock.calls.at(-1)?.[0];
    expect(embeddingsRequest?.input).toEqual(["Single input text"]);
    expect(embeddingsRequest?.model).toBe("TEST_MODEL");
  });

  it("embedding with null options", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "NULL_OPTIONS_MODEL",
      embeddings: [[0.5]],
      total_duration: 5,
      load_duration: 2,
      prompt_eval_count: 1,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({
        model: "NULL_OPTIONS_MODEL",
      }),
    });

    const response = await embeddingModel.call(
      new EmbeddingRequest(["Null options test"], null),
    );

    expect(response.results).toHaveLength(1);
    expect(response.metadata.model).toBe("NULL_OPTIONS_MODEL");

    const embeddingsRequest = ollamaApi.embed.mock.calls.at(-1)?.[0];
    expect(embeddingsRequest?.model).toBe("NULL_OPTIONS_MODEL");
    expect(embeddingsRequest?.options).toEqual({});
  });

  it("embedding with multiple large inputs", async () => {
    const largeInputs = [
      "This is a very long text input that might be used for document embedding scenarios",
      "Another substantial piece of text content that could represent a paragraph or section",
      "A third lengthy input to test batch processing capabilities of the embedding model",
    ];
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "BATCH_MODEL",
      embeddings: [
        [0.1, 0.2, 0.3, 0.4],
        [0.5, 0.6, 0.7, 0.8],
        [0.9, 1.0, 1.1, 1.2],
      ],
      total_duration: 150,
      load_duration: 75,
      prompt_eval_count: 3,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({ model: "BATCH_MODEL" }),
    });

    const response = await embeddingModel.call(
      new EmbeddingRequest(largeInputs, EmbeddingOptions.builder().build()),
    );

    expect(response.results).toHaveLength(3);
    expect(response.results[0].output).toHaveLength(4);
    expect(response.results[1].output).toHaveLength(4);
    expect(response.results[2].output).toHaveLength(4);

    expect(ollamaApi.embed.mock.calls.at(-1)?.[0].input).toEqual(largeInputs);
  });

  it("embedding with custom keep alive formats", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "KEEPALIVE_MODEL",
      embeddings: [[1.0]],
      total_duration: 5,
      load_duration: 2,
      prompt_eval_count: 1,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({
        model: "KEEPALIVE_MODEL",
      }),
    });

    const secondsOptions = new OllamaEmbeddingOptions({
      model: "KEEPALIVE_MODEL",
      keepAlive: "300s",
    });
    await embeddingModel.call(
      new EmbeddingRequest(["Keep alive seconds"], secondsOptions),
    );
    expect(ollamaApi.embed.mock.calls.at(-1)?.[0].keep_alive).toBe("300s");

    const hoursOptions = new OllamaEmbeddingOptions({
      model: "KEEPALIVE_MODEL",
      keepAlive: "2h",
    });
    await embeddingModel.call(
      new EmbeddingRequest(["Keep alive hours"], hoursOptions),
    );
    expect(ollamaApi.embed.mock.calls.at(-1)?.[0].keep_alive).toBe("2h");
  });

  it("embedding response metadata", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "METADATA_MODEL",
      embeddings: [[0.1, 0.2]],
      total_duration: 100,
      load_duration: 50,
      prompt_eval_count: 25,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({ model: "METADATA_MODEL" }),
    });

    const response = await embeddingModel.call(
      new EmbeddingRequest(
        ["Metadata test"],
        EmbeddingOptions.builder().build(),
      ),
    );

    expect(response.metadata.model).toBe("METADATA_MODEL");
    expect(response.metadata.usage.promptTokens).toBe(25);
    expect(response.results).toHaveLength(1);
  });

  it("embedding with zero length vectors", async () => {
    const ollamaApi = createOllamaApiMock();
    ollamaApi.embed.mockResolvedValue({
      model: "ZERO_MODEL",
      embeddings: [[]],
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 1,
    });

    const embeddingModel = new OllamaEmbeddingModel({
      ollamaApi,
      defaultOptions: new OllamaEmbeddingOptions({ model: "ZERO_MODEL" }),
    });

    const response = await embeddingModel.call(
      new EmbeddingRequest(
        ["Zero length test"],
        EmbeddingOptions.builder().build(),
      ),
    );

    expect(response.results).toHaveLength(1);
    expect(response.results[0].output).toEqual([]);
  });
});

function createOllamaApiMock() {
  return {
    embed: vi.fn(),
  } as unknown as OllamaApi & {
    embed: ReturnType<typeof vi.fn<OllamaApi["embed"]>>;
  };
}
