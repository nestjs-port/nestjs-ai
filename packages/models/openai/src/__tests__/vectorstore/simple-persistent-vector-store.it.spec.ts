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

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type JsonMetadataGenerator,
  JsonReader,
} from "@nestjs-ai/commons";
import { SimpleVectorStore } from "@nestjs-ai/vector-store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OpenAiEmbeddingModel } from "../../open-ai-embedding-model";
import { OpenAiEmbeddingOptions } from "../../open-ai-embedding-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class ProductMetadataGenerator implements JsonMetadataGenerator {
  generate(jsonMap: Record<string, unknown>): Record<string, unknown> {
    return { name: jsonMap.name };
  }
}

describe.skipIf(!OPENAI_API_KEY)("SimplePersistentVectorStoreIT", () => {
  let workingDir: string;

  const bikesJsonResource = resolve( __dirname, "bikes.json", );

  const embeddingModel = new OpenAiEmbeddingModel({
    options: OpenAiEmbeddingOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  beforeEach(() => {
    workingDir = mkdtempSync(join(tmpdir(), "simple-persistent-vector-store-"));
  });

  afterEach(() => {
    rmSync(workingDir, { recursive: true, force: true });
  });

  it("persist", async () => {
    const jsonReader = new JsonReader({
      resource: bikesJsonResource,
      jsonMetadataGenerator: new ProductMetadataGenerator(),
      jsonKeysToUse: [
        "price",
        "name",
        "shortDescription",
        "description",
        "tags",
      ],
    });
    const documents = await jsonReader.get();
    const vectorStore = SimpleVectorStore.builder(embeddingModel).build();
    await vectorStore.add(documents);

    const tempFile = join(workingDir, "temp.txt");
    await vectorStore.save(tempFile);
    const tempFileContent = readFileSync(tempFile, "utf8");
    expect(tempFileContent.length).toBeGreaterThan(0);
    expect(tempFileContent).toContain("Velo 99 XR1 AXS");
    const vectorStore2 = SimpleVectorStore.builder(embeddingModel).build();

    await vectorStore2.load(tempFile);
    const similaritySearch = await vectorStore2.similaritySearch(
      "Velo 99 XR1 AXS",
    );
    expect(similaritySearch.length).toBeGreaterThan(0);
    expect(similaritySearch[0].metadata).toHaveProperty(
      "name",
      "Velo 99 XR1 AXS",
    );
  });
});
