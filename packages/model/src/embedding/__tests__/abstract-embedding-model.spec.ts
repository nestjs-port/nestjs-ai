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

import { describe, expect, it, vi } from "vitest";
import { AbstractEmbeddingModel } from "../abstract-embedding-model";
import type { EmbeddingModel } from "../embedding-model";

describe("AbstractEmbeddingModel", () => {
  it("unknown model dimension", async () => {
    const embedMock = vi
      .fn<(text: string) => Promise<number[]>>()
      .mockResolvedValue([0.1, 0.1, 0.1]);
    const embeddingModel = { embed: embedMock } as unknown as EmbeddingModel;

    await expect(
      AbstractEmbeddingModel.dimensions(
        embeddingModel,
        "unknown_model",
        "Hello world!",
      ),
    ).resolves.toBe(3);
    expect(embedMock).toHaveBeenCalledOnce();
    expect(embedMock).toHaveBeenCalledWith("Hello world!");
  });
});
