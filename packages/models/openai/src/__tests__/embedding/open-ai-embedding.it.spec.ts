/*
 * Copyright 2026 the original author or authors.
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Document } from "@nestjs-ai/commons";
import { EmbeddingRequest, TokenCountBatchingStrategy } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { OpenAiEmbeddingModel } from "../../open-ai-embedding-model";
import { OpenAiEmbeddingOptions } from "../../open-ai-embedding-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiEmbeddingIT", () => {
  const openAiSdkEmbeddingModel = new OpenAiEmbeddingModel({
    options: OpenAiEmbeddingOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  const textSource = readFileSync(
    resolve(__dirname, "text_source.txt"),
    "utf8",
  );

  it("default embedding", async () => {
    expect(openAiSdkEmbeddingModel).not.toBeNull();

    const embeddingResponse = await openAiSdkEmbeddingModel.embedForResponse([
      "Hello World",
    ]);
    expect(embeddingResponse.results).toHaveLength(1);
    expect(embeddingResponse.results[0]).not.toBeNull();
    expect(embeddingResponse.results[0]?.output).toHaveLength(1536);
    expect(embeddingResponse.metadata.usage.totalTokens).toBe(2);
    expect(embeddingResponse.metadata.usage.promptTokens).toBe(2);

    expect(await openAiSdkEmbeddingModel.dimensions()).toBe(1536);
    expect(embeddingResponse.metadata.model).toContain(
      OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL,
    );
  });

  it("embedding batch documents", async () => {
    expect(openAiSdkEmbeddingModel).not.toBeNull();
    const embeddings = await openAiSdkEmbeddingModel.embed(
      [
        new Document("Hello world"),
        new Document("Hello Spring"),
        new Document("Hello Spring AI!"),
      ],
      OpenAiEmbeddingOptions.builder().model("text-embedding-ada-002").build(),
      new TokenCountBatchingStrategy(),
    );
    expect(embeddings).toHaveLength(3);
    const dimensions = await openAiSdkEmbeddingModel.dimensions();
    for (const embedding of embeddings) {
      expect(embedding).toHaveLength(dimensions);
    }
  });

  it("embedding batch documents that exceed the limit", async () => {
    expect(openAiSdkEmbeddingModel).not.toBeNull();
    await expect(
      openAiSdkEmbeddingModel.embed(
        [new Document("Hello World"), new Document(textSource)],
        OpenAiEmbeddingOptions.builder()
          .model("text-embedding-ada-002")
          .build(),
        new TokenCountBatchingStrategy(),
      ),
    ).rejects.toThrow();
  });

  it("embedding3 large", async () => {
    const embeddingResponse = await openAiSdkEmbeddingModel.call(
      new EmbeddingRequest(
        ["Hello World"],
        OpenAiEmbeddingOptions.builder()
          .model("text-embedding-3-large")
          .build(),
      ),
    );
    expect(embeddingResponse.results).toHaveLength(1);
    expect(embeddingResponse.results[0]).not.toBeNull();
    expect(embeddingResponse.results[0]?.output).toHaveLength(3072);
    expect(embeddingResponse.metadata.usage.totalTokens).toBe(2);
    expect(embeddingResponse.metadata.usage.promptTokens).toBe(2);
    expect(embeddingResponse.metadata.model).toBe("text-embedding-3-large");
  });

  it("text embedding ada002", async () => {
    const embeddingResponse = await openAiSdkEmbeddingModel.call(
      new EmbeddingRequest(
        ["Hello World"],
        OpenAiEmbeddingOptions.builder()
          .model("text-embedding-3-small")
          .build(),
      ),
    );
    expect(embeddingResponse.results).toHaveLength(1);
    expect(embeddingResponse.results[0]).not.toBeNull();
    expect(embeddingResponse.results[0]?.output).toHaveLength(1536);

    expect(embeddingResponse.metadata.usage.totalTokens).toBe(2);
    expect(embeddingResponse.metadata.usage.promptTokens).toBe(2);
    expect(embeddingResponse.metadata.model).toBe("text-embedding-3-small");
  });
});
