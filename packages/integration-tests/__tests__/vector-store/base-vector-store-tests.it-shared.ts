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

import { setTimeout as delay } from "node:timers/promises";
import { Document } from "@nestjs-ai/commons";
import {
  Filter,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import { expect } from "vitest";

/**
 * Shared base suite for vector store integration tests.
 * Concrete suites can call these methods from Vitest `it` blocks.
 */
export abstract class BaseVectorStoreTests {
  protected abstract executeTest(
    testFunction: (vectorStore: VectorStore) => Promise<void> | void,
  ): Promise<void>;

  protected createDocument(country: string, year: number | null): Document {
    const metadata: Record<string, unknown> = { country };
    if (year != null) {
      metadata.year = year;
    }
    return new Document(
      "The World is Big and Salvation Lurks Around the Corner",
      metadata,
    );
  }

  protected async setupTestDocuments(
    vectorStore: VectorStore,
  ): Promise<Document[]> {
    const doc1 = this.createDocument("BG", 2020);
    const doc2 = this.createDocument("NL", null);
    const doc3 = this.createDocument("BG", 2023);

    const documents = [doc1, doc2, doc3];
    await vectorStore.add(documents);

    return documents;
  }

  private normalizeValue(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    return String(value).replace(/^"|"$/g, "").trim();
  }

  private async waitForAssert(
    assertFunction: () => void | Promise<void>,
    timeoutMs = 5_000,
    pollIntervalMs = 500,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() <= deadline) {
      try {
        await assertFunction();
        return;
      } catch (error) {
        lastError = error;
      }

      await delay(pollIntervalMs);
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Condition was not met within the allotted time");
  }

  private async verifyDocumentsExist(
    vectorStore: VectorStore,
    documents: Document[],
  ): Promise<void> {
    await this.waitForAssert(async () => {
      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(documents.length)
          .similarityThresholdAll()
          .build(),
      );
      expect(results).toHaveLength(documents.length);
    });
  }

  private async verifyDocumentsDeleted(
    vectorStore: VectorStore,
    deletedIds: string[],
  ): Promise<void> {
    await this.waitForAssert(async () => {
      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(10)
          .similarityThresholdAll()
          .build(),
      );

      const foundIds = results.map((document) => document.id);
      for (const deletedId of deletedIds) {
        expect(foundIds).not.toContain(deletedId);
      }
    });
  }

  async deleteById(): Promise<void> {
    await this.executeTest(async (vectorStore) => {
      const documents = await this.setupTestDocuments(vectorStore);
      await this.verifyDocumentsExist(vectorStore, documents);

      const idsToDelete = [documents[0].id, documents[1].id];
      await vectorStore.delete(idsToDelete);
      await this.verifyDocumentsDeleted(vectorStore, idsToDelete);

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .build(),
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(documents[2].id);
      const metadata = results[0]?.metadata ?? {};
      expect(this.normalizeValue(metadata["country"])).toBe("BG");
      // the values are converted into Double
      expect(this.normalizeValue(metadata["year"])).toMatch(/^2023(?:\.0)?$/);

      await vectorStore.delete([documents[2].id]);
    });
  }

  async deleteWithStringFilterExpression(): Promise<void> {
    await this.executeTest(async (vectorStore) => {
      const documents = await this.setupTestDocuments(vectorStore);
      await this.verifyDocumentsExist(vectorStore, documents);

      const bgDocIds = documents
        .filter((document) => document.metadata.country === "BG")
        .map((document) => document.id);

      await vectorStore.delete("country == 'BG'");
      await this.verifyDocumentsDeleted(vectorStore, bgDocIds);

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .build(),
      );

      expect(results).toHaveLength(1);
      expect(this.normalizeValue(results[0]?.metadata["country"])).toBe("NL");

      await vectorStore.delete([documents[1].id]);
    });
  }

  async deleteByFilter(): Promise<void> {
    await this.executeTest(async (vectorStore) => {
      const documents = await this.setupTestDocuments(vectorStore);
      await this.verifyDocumentsExist(vectorStore, documents);

      const bgDocIds = documents
        .filter((document) => document.metadata.country === "BG")
        .map((document) => document.id);

      const filterExpression = new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      );

      await vectorStore.delete(filterExpression);
      await this.verifyDocumentsDeleted(vectorStore, bgDocIds);

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .build(),
      );

      expect(results).toHaveLength(1);
      expect(this.normalizeValue(results[0]?.metadata["country"])).toBe("NL");

      await vectorStore.delete([documents[1].id]);
    });
  }
}
