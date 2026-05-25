/*
 * Copyright 2026-present the original author or authors.
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

import { of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OllamaApi } from "../../api/ollama-api.js";
import { ModelManagementOptions } from "../model-management-options.js";
import { OllamaModelManager } from "../ollama-model-manager.js";
import { PullModelStrategy } from "../pull-model-strategy.js";

describe("OllamaModelManager", () => {
  let listModels: ReturnType<typeof vi.fn>;
  let deleteModel: ReturnType<typeof vi.fn>;
  let pullModel: ReturnType<typeof vi.fn>;
  let ollamaApi: OllamaApi;

  beforeEach(() => {
    listModels = vi.fn();
    deleteModel = vi.fn();
    pullModel = vi.fn();

    ollamaApi = {
      listModels,
      deleteModel,
      pullModel,
    } as unknown as OllamaApi;
  });

  it("returns true when a plain model name matches a latest model", async () => {
    listModels.mockResolvedValue({
      models: [{ name: "qwen2.5:3b" }],
    });

    const modelManager = new OllamaModelManager({ ollamaApi });

    await expect(modelManager.isModelAvailable("qwen2.5")).resolves.toBe(true);
  });

  it("skips pulling when the model is already available", async () => {
    listModels.mockResolvedValue({
      models: [{ name: "all-minilm:latest" }],
    });

    const modelManager = new OllamaModelManager({
      ollamaApi,
      options: new ModelManagementOptions({
        pullModelStrategy: PullModelStrategy.WHEN_MISSING,
      }),
    });

    await modelManager.pullModel("all-minilm");

    expect(pullModel).not.toHaveBeenCalled();
  });

  it("deletes a model only when it exists", async () => {
    listModels.mockResolvedValue({
      models: [{ name: "nomic-embed-text:latest" }],
    });
    deleteModel.mockResolvedValue(undefined);

    const modelManager = new OllamaModelManager({ ollamaApi });

    await modelManager.deleteModel("nomic-embed-text");

    expect(deleteModel).toHaveBeenCalledWith({ model: "nomic-embed-text" });
  });

  it("initializes additional models", async () => {
    const modelManager = new OllamaModelManager({
      ollamaApi,
      options: new ModelManagementOptions({
        additionalModels: ["all-minilm"],
      }),
    });

    const pullModelSpy = vi
      .spyOn(modelManager, "pullModel")
      .mockResolvedValue(undefined);

    await modelManager.initialize();

    expect(pullModelSpy).toHaveBeenCalledWith("all-minilm");
  });

  it("uses the pull stream when the model is missing", async () => {
    listModels.mockResolvedValue({ models: [] });
    pullModel.mockReturnValue(
      of(
        {
          status: "downloading",
          digest: "digest",
          total: 10,
          completed: 1,
        },
        {
          status: "success",
          digest: "digest",
          total: 10,
          completed: 10,
        } as OllamaApi.ProgressResponse,
      ),
    );

    const modelManager = new OllamaModelManager({
      ollamaApi,
      options: new ModelManagementOptions({
        pullModelStrategy: PullModelStrategy.ALWAYS,
      }),
    });

    await expect(modelManager.pullModel("all-minilm")).resolves.toBeUndefined();
    expect(pullModel).toHaveBeenCalledWith({
      model: "all-minilm",
      insecure: false,
      stream: true,
    });
  });
});
