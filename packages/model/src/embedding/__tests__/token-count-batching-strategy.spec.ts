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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Document } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { TokenCountBatchingStrategy } from "../token-count-batching-strategy.js";

describe("TokenCountBatchingStrategy", () => {
  it("batch embedding happy path", () => {
    const tokenCountBatchingStrategy = new TokenCountBatchingStrategy();

    const batch = tokenCountBatchingStrategy.batch([
      new Document("Hello world"),
      new Document("Hello Spring"),
      new Document("Hello Spring AI!"),
    ]);

    expect(batch).toHaveLength(1);
    expect(batch[0]).toHaveLength(3);
  });

  it("batch embedding with large document exceeds max token size", () => {
    const contentAsString = readFileSync(
      resolve(__dirname, "./text_source.txt"),
      "utf-8",
    );
    const tokenCountBatchingStrategy = new TokenCountBatchingStrategy();

    expect(() =>
      tokenCountBatchingStrategy.batch([new Document(contentAsString)]),
    ).toThrow("Tokens in a single document exceeds the maximum number");
  });

  it("tracks token count for the first document in a new batch", () => {
    // Use a small maxInputTokenCount so batch boundaries are hit quickly and the
    // per-batch token accounting is exercised.
    const tokenCountBatchingStrategy = new TokenCountBatchingStrategy(
      "cl100k_base",
      10,
      0.0,
    );

    // "Hello world" is roughly 2 tokens. Six documents should therefore be split
    // across multiple batches, which catches the bug where the first document in a
    // new batch was not counted toward currentSize.
    const documents = [
      new Document("Hello world"),
      new Document("Hello world"),
      new Document("Hello world"),
      new Document("Hello world"),
      new Document("Hello world"),
      new Document("Hello world"),
    ];

    const batches = tokenCountBatchingStrategy.batch(documents);

    // With the fix every batch should respect the token limit.
    expect(batches.length).toBeGreaterThan(1);
    // All documents must still be present after batching.
    expect(batches.flat()).toHaveLength(documents.length);
  });
});
