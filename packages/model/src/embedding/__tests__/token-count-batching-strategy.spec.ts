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
import { TokenCountBatchingStrategy } from "../token-count-batching-strategy";

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
});
