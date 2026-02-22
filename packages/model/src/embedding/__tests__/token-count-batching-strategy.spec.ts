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
