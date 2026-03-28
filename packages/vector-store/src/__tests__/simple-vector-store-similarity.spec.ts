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

import { describe, expect, it } from "vitest";
import { SimpleVectorStoreContent } from "../simple-vector-store-content";

describe("SimpleVectorStoreSimilarityTests", () => {
  it("test similarity", () => {
    const metadata = { foo: "bar" };
    const testEmbedding = [1.0, 2.0, 3.0];

    const storeContent = new SimpleVectorStoreContent({
      id: "1",
      text: "hello, how are you?",
      metadata,
      embedding: testEmbedding,
    });
    const document = storeContent.toDocument(0.6);
    expect(document).toBeDefined();
    expect(document.id).toBe("1");
    expect(document.text).toBe("hello, how are you?");
    expect(document.metadata.foo).toBe("bar");
  });

  it("test empty id", () => {
    const metadata = {};
    const embedding = [1.0];

    expect(
      () =>
        new SimpleVectorStoreContent({
          id: "",
          text: "text content",
          metadata,
          embedding,
        }),
    ).toThrow("id must not be null or empty");
  });

  it("test empty embedding array", () => {
    const metadata = {};
    const emptyEmbedding: number[] = [];

    expect(
      () =>
        new SimpleVectorStoreContent({
          id: "valid-id",
          text: "text content",
          metadata,
          embedding: emptyEmbedding,
        }),
    ).toThrow("embedding vector must not be empty");
  });

  it("test single element embedding", () => {
    const metadata = {};
    const singleEmbedding = [0.1];

    const storeContent = new SimpleVectorStoreContent({
      id: "id-1",
      text: "text",
      metadata,
      embedding: singleEmbedding,
    });
    const document = storeContent.toDocument(0.1);

    expect(document).toBeDefined();
    expect(document.score).toBe(0.1);
  });

  it("test null metadata", () => {
    const embedding = [1.0];

    expect(
      () =>
        new SimpleVectorStoreContent({
          id: "id-1",
          text: "text",
          metadata: null as unknown as Record<string, unknown>,
          embedding,
        }),
    ).toThrow("metadata must not be null");
  });

  it("test metadata immutability", () => {
    const originalMetadata: Record<string, unknown> = { key: "original" };
    const embedding = [1.0];

    const storeContent = new SimpleVectorStoreContent({
      id: "id-1",
      text: "text",
      metadata: originalMetadata,
      embedding,
    });

    originalMetadata.key = "modified";
    originalMetadata.new = "value";

    const document = storeContent.toDocument(0.5);

    expect(document.metadata.key).toBe("original");
    expect(document.metadata).not.toHaveProperty("new");
  });

  it("test whitespace only text", () => {
    const metadata = {};
    const embedding = [1.0];
    const whitespaceTexts = ["   ", "\t\t", "\n\n", "\r\n", "   \t\n\r   "];

    for (const whitespace of whitespaceTexts) {
      const storeContent = new SimpleVectorStoreContent({
        id: "ws-id",
        text: whitespace,
        metadata,
        embedding,
      });
      const document = storeContent.toDocument(0.1);
      expect(document.text).toBe(whitespace);
    }
  });

  it("test empty string text", () => {
    const metadata = {};
    const embedding = [1.0];

    const storeContent = new SimpleVectorStoreContent({
      id: "empty-id",
      text: "",
      metadata,
      embedding,
    });
    const document = storeContent.toDocument(0.1);

    expect(document.text).toBe("");
  });
});
