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

import { Test, type TestingModule } from "@nestjs/testing";
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";

import type { GoogleGenAiTextEmbeddingModel } from "../../text/google-gen-ai-text-embedding-model.js";
import { GoogleGenAiTextEmbeddingModelModule } from "../google-gen-ai-text-embedding-model.module.js";
import type { GoogleGenAiTextEmbeddingProperties } from "../google-gen-ai-embedding-properties.js";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const TEST_TIMEOUT = 600_000;

describe("GoogleGenAiTextEmbeddingModelModuleIT", () => {
  it.skipIf(!GOOGLE_API_KEY)(
    "embedding with api key",
    async () => {
      const moduleRef = await createTestingModule({ apiKey: GOOGLE_API_KEY });
      const embeddingModel = moduleRef.get<GoogleGenAiTextEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      // Default model (gemini-embedding-001) supports batch size 1 on Gemini API
      const embeddingResponse = await embeddingModel.embedForResponse([
        "Hello World",
      ]);
      expect(embeddingResponse.results).toHaveLength(1);
      expect(embeddingResponse.results[0].output).not.toHaveLength(0);
      expect(embeddingResponse.metadata.model).not.toBeNull();
    },
    TEST_TIMEOUT,
  );

  it.skipIf(!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION)(
    "embedding with vertex ai",
    async () => {
      const moduleRef = await createTestingModule({
        projectId: GOOGLE_CLOUD_PROJECT,
        location: GOOGLE_CLOUD_LOCATION,
      });
      const embeddingModel = moduleRef.get<GoogleGenAiTextEmbeddingModel>(
        EMBEDDING_MODEL_TOKEN,
      );

      const embeddingResponse = await embeddingModel.embedForResponse([
        "Hello World",
        "World is big",
      ]);
      expect(embeddingResponse.results).toHaveLength(2);
      expect(embeddingResponse.results[0].output).not.toHaveLength(0);
      expect(embeddingResponse.results[1].output).not.toHaveLength(0);
      expect(embeddingResponse.metadata.model).not.toBeNull();
    },
    TEST_TIMEOUT,
  );
});

async function createTestingModule(
  properties: GoogleGenAiTextEmbeddingProperties,
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [GoogleGenAiTextEmbeddingModelModule.forFeature(properties)],
  }).compile();
}
