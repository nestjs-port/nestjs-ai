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

import "reflect-metadata";

import { Test } from "@nestjs/testing";
import { EMBEDDING_MODEL_TOKEN } from "@nestjs-ai/commons";
import { EmbeddingRequest } from "@nestjs-ai/model";
import {
  OPEN_AI_EMBEDDING_DEFAULT_MODEL,
  type OpenAiEmbeddingModel,
  OpenAiEmbeddingModelModule,
  type OpenAiEmbeddingProperties,
} from "@nestjs-ai/model-openai";
import { describe, expect, it } from "vitest";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function createEmbeddingModel(
  properties: OpenAiEmbeddingProperties,
): Promise<OpenAiEmbeddingModel> {
  const moduleRef = await Test.createTestingModule({
    imports: [OpenAiEmbeddingModelModule.forFeature(properties)],
  }).compile();

  return moduleRef.get<OpenAiEmbeddingModel>(EMBEDDING_MODEL_TOKEN);
}

describe.skipIf(!OPENAI_API_KEY)("OpenAiEmbeddingModelModuleIT", () => {
  it("embedding", async () => {
    const embeddingModel = await createEmbeddingModel({
      apiKey: OPENAI_API_KEY ?? "",
    });

    const embeddingResponse = await embeddingModel.call(
      new EmbeddingRequest([
        "Hello World",
        "World is big and salvation is near",
      ]),
    );

    expect(embeddingResponse.results).toHaveLength(2);
    expect(embeddingResponse.results[0].output).not.toHaveLength(0);
    expect(embeddingResponse.results[0].index).toBe(0);
    expect(embeddingResponse.results[1].output).not.toHaveLength(0);
    expect(embeddingResponse.results[1].index).toBe(1);

    expect(await embeddingModel.dimensions()).toBe(1536);
  });

  it("embeddingActivation", async () => {
    const defaultEmbeddingModel = await createEmbeddingModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST_BASE_URL",
    });

    expect(defaultEmbeddingModel.options.apiKey).toBe("API_KEY");
    expect(defaultEmbeddingModel.options.baseUrl).toBe("http://TEST_BASE_URL");
    expect(defaultEmbeddingModel.options.model).toBe(
      OPEN_AI_EMBEDDING_DEFAULT_MODEL,
    );

    const explicitEmbeddingModel = await createEmbeddingModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST_BASE_URL",
      model: "openai-sdk",
    });

    expect(explicitEmbeddingModel.options.model).toBe("openai-sdk");
  });

  it("embeddingOptionsTest", async () => {
    const embeddingModel = await createEmbeddingModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST_BASE_URL",
      options: {
        model: "MODEL_XYZ",
        user: "userXYZ",
      },
    });

    const embeddingOptions = embeddingModel.options;

    expect(embeddingOptions.baseUrl).toBe("http://TEST_BASE_URL");
    expect(embeddingOptions.apiKey).toBe("API_KEY");
    expect(embeddingOptions.model).toBe("MODEL_XYZ");
    expect(embeddingOptions.user).toBe("userXYZ");
  });
});
