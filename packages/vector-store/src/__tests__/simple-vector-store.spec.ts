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

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, Media, MediaFormat } from "@nestjs-ai/commons";
import {
  Embedding,
  EmbeddingModel,
  type EmbeddingRequest,
  EmbeddingResponse,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { FilterExpressionBuilder } from "../filter";
import { SearchRequest } from "../search-request";
import { EmbeddingMath, SimpleVectorStore } from "../simple-vector-store";

class MockEmbeddingModel extends EmbeddingModel {
  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const embeddings = request.instructions.map((text, index) => {
      if (text === "query") {
        return new Embedding([0.9, 0.9, 0.9], index);
      }
      return new Embedding([0.1, 0.2, 0.3], index);
    });
    return new EmbeddingResponse(embeddings);
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    if (document.text === "query") {
      return [0.9, 0.9, 0.9];
    }
    return [0.1, 0.2, 0.3];
  }
}

describe("SimpleVectorStoreTests", () => {
  it("shouldAddAndRetrieveDocument", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder()
      .id("1")
      .text("test content")
      .metadata({ key: "value" })
      .build();

    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch("test content");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("test content");
    expect(results[0].metadata).toMatchObject({ key: "value" });
  });

  it("shouldAddMultipleDocuments", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const docs = [
      Document.builder().id("1").text("first").build(),
      Document.builder().id("2").text("second").build(),
    ];

    await vectorStore.add(docs);

    const results = await vectorStore.similaritySearch("first");
    expect(results).toHaveLength(2);
    expect(results.map((result) => result.id).sort()).toEqual(["1", "2"]);
  });

  it("shouldHandleEmptyDocumentList", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();

    await expect(vectorStore.add([])).rejects.toThrow(
      "Documents list cannot be empty",
    );
  });

  it("shouldHandleNullDocumentList", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();

    await expect(
      vectorStore.add(null as unknown as Document[]),
    ).rejects.toThrow("Documents list cannot be null");
  });

  it("shouldDeleteDocuments", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder().id("1").text("test content").build();

    await vectorStore.add([doc]);
    expect(await vectorStore.similaritySearch("test")).toHaveLength(1);

    await vectorStore.delete(["1"]);
    expect(await vectorStore.similaritySearch("test")).toHaveLength(0);
  });

  it("shouldDeleteDocumentsByFilter", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder()
      .id("1")
      .text("test content")
      .metadata("testKey", 1)
      .build();

    await vectorStore.add([doc]);
    expect(await vectorStore.similaritySearch("test")).toHaveLength(1);

    const builder = new FilterExpressionBuilder();
    const condition = builder.eq("testKey", 1).build();

    await vectorStore.delete(condition);
    expect(await vectorStore.similaritySearch("test")).toHaveLength(0);
  });

  it("shouldHandleDeleteOfNonexistentDocument", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();

    await vectorStore.delete(["nonexistent-id"]);
    // Should not throw exception
    await expect(
      vectorStore.delete(["nonexistent-id"]),
    ).resolves.toBeUndefined();
  });

  it("shouldPerformSimilaritySearchWithThreshold", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    // Configure mock to return different embeddings for different queries
    const doc = Document.builder().id("1").text("test content").build();

    await vectorStore.add([doc]);

    const request = SearchRequest.builder()
      .query("query")
      .similarityThreshold(0.99)
      .topK(5)
      .build();

    const results = await vectorStore.similaritySearch(request);
    expect(results).toHaveLength(0);
  });

  it("shouldSaveAndLoadVectorStore", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const tempDir = mkdtempSync(join(tmpdir(), "simple-vector-store-tests-"));
    const saveFile = join(tempDir, "vector-store.json");

    try {
      const doc = Document.builder()
        .id("1")
        .text("test content")
        .metadata({ key: "value" })
        .build();

      await vectorStore.add([doc]);
      await vectorStore.save(saveFile);

      const loadedStore = SimpleVectorStore.builder(
        new MockEmbeddingModel(),
      ).build();
      await loadedStore.load(saveFile);

      const results = await loadedStore.similaritySearch("test content");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("1");
      expect(results[0].text).toBe("test content");
      expect(results[0].metadata).toMatchObject({ key: "value" });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("shouldHandleLoadFromInvalidResource", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();

    await expect(
      vectorStore.load("/definitely/not/found/resource.json"),
    ).rejects.toThrow(
      "ENOENT: no such file or directory, open '/definitely/not/found/resource.json'",
    );
  });

  it("shouldHandleSaveToInvalidLocation", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const tempDir = mkdtempSync(join(tmpdir(), "simple-vector-store-dir-"));

    try {
      await expect(vectorStore.save(tempDir)).rejects.toThrow(
        "EISDIR: illegal operation on a directory, open",
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("shouldHandleConcurrentOperations", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const numThreads = 10;

    await Promise.all(
      Array.from({ length: numThreads }, async (_, i) => {
        const id = String(i);
        const doc = Document.builder().id(id).text(`content ${id}`).build();
        await vectorStore.add([doc]);
      }),
    );

    const request = SearchRequest.builder()
      .query("test")
      .topK(numThreads)
      .build();
    const results = await vectorStore.similaritySearch(request);

    expect(results).toHaveLength(numThreads);

    // Verify all documents were properly added
    const resultIds = new Set(results.map((document) => document.id));
    const expectedIds = new Set(
      Array.from({ length: numThreads }, (_, i) => String(i)),
    );
    expect(resultIds).toEqual(expectedIds);

    // Verify content integrity
    results.forEach((document) => {
      expect(document.text).toBe(`content ${document.id}`);
    });
  });

  it("shouldRejectInvalidSimilarityThreshold", () => {
    expect(() =>
      SearchRequest.builder().query("test").similarityThreshold(2.0).build(),
    ).toThrow("Similarity threshold must be in [0,1] range.");
  });

  it("shouldRejectNegativeTopK", () => {
    expect(() =>
      SearchRequest.builder().query("test").topK(-1).build(),
    ).toThrow("TopK should be positive.");
  });

  it("shouldHandleCosineSimilarityEdgeCases", () => {
    const zeroVector = [0, 0, 0];
    const normalVector = [1, 1, 1];

    expect(() =>
      EmbeddingMath.cosineSimilarity(zeroVector, normalVector),
    ).toThrow("Vectors cannot have zero norm");
  });

  it("shouldHandleVectorLengthMismatch", () => {
    const vector1 = [1, 2];
    const vector2 = [1, 2, 3];

    expect(() => EmbeddingMath.cosineSimilarity(vector1, vector2)).toThrow(
      "Vectors lengths must be equal",
    );
  });

  it("shouldHandleNullVectors", () => {
    const vector = [1, 2, 3];

    expect(() =>
      EmbeddingMath.cosineSimilarity(null as unknown as number[], vector),
    ).toThrow("Vectors must not be null");

    expect(() =>
      EmbeddingMath.cosineSimilarity(vector, null as unknown as number[]),
    ).toThrow("Vectors must not be null");
  });

  it("shouldFailNonTextDocuments", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const media = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: Buffer.from([0x00]),
    });

    const imgDoc = Document.builder()
      .media(media)
      .metadata({ fileName: "pixel.png" })
      .build();

    await expect(vectorStore.add([imgDoc])).rejects.toThrow(
      "Only text documents are supported for now. One of the documents contains non-text content.",
    );
  });

  it("shouldHandleDocumentWithoutId", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder().text("content without id").build();

    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch("content");
    expect(results).toHaveLength(1);
    expect(results[0].id.length).toBeGreaterThan(0);
  });

  it("shouldHandleDocumentWithEmptyText", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder().id("1").text("").build();

    await expect(vectorStore.add([doc])).resolves.toBeUndefined();

    const results = await vectorStore.similaritySearch("anything");
    expect(results).toHaveLength(1);
  });

  it("shouldReplaceDocumentWithSameId", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc1 = Document.builder()
      .id("1")
      .text("original")
      .metadata({ version: "1" })
      .build();
    const doc2 = Document.builder()
      .id("1")
      .text("updated")
      .metadata({ version: "2" })
      .build();

    await vectorStore.add([doc1]);
    await vectorStore.add([doc2]);

    const results = await vectorStore.similaritySearch("updated");
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("updated");
    expect(results[0].metadata).toMatchObject({ version: "2" });
  });

  it("shouldHandleSearchWithEmptyQuery", async () => {
    const vectorStore = SimpleVectorStore.builder(
      new MockEmbeddingModel(),
    ).build();
    const doc = Document.builder().id("1").text("content").build();
    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch("");
    expect(results).toHaveLength(1);
  });
});
