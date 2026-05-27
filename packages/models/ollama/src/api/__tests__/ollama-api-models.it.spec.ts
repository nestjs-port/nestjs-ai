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

import { lastValueFrom, timeout, toArray } from "rxjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "../../__tests__/ollama-test-context.js";
import type { OllamaApi } from "../ollama-api.js";

const TEST_TIMEOUT = 600_000;
const MODEL = "all-minilm";

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaApiModelsIT", () => {
  let context: OllamaTestContext;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "list models",
    async () => {
      const listModelResponse = await context.api.listModels();

      expect(listModelResponse).toBeTruthy();
      expect(listModelResponse.models.length).toBeGreaterThan(0);
      expect(
        listModelResponse.models.some((model) => model.name.includes(MODEL)),
      ).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "show model",
    async () => {
      const showModelResponse = await context.api.showModel({ model: MODEL });

      expect(showModelResponse).toBeTruthy();
      expect(showModelResponse.details.family).toBe("bert");
    },
    TEST_TIMEOUT,
  );

  it(
    "copy and delete model",
    async () => {
      const customModel = "schrodinger";

      await expect(
        context.api.copyModel({ source: MODEL, destination: customModel }),
      ).resolves.toBeUndefined();

      await expect(
        context.api.deleteModel({ model: customModel }),
      ).resolves.toBeUndefined();
    },
    TEST_TIMEOUT,
  );

  it(
    "pull model",
    async () => {
      await expect(
        context.api.deleteModel({ model: MODEL }),
      ).resolves.toBeUndefined();

      let listModelResponse = await context.api.listModels();
      expect(
        listModelResponse.models.some((model) => model.name.includes(MODEL)),
      ).toBe(false);

      const progressResponses = await lastValueFrom(
        context.api
          .pullModel({
            model: MODEL,
            insecure: false,
            stream: true,
          })
          .pipe(timeout(300_000), toArray()),
      );

      expect(progressResponses).toBeTruthy();
      expect(progressResponses.at(-1)).toEqual({
        status: "success",
      } satisfies Partial<OllamaApi.ProgressResponse>);

      listModelResponse = await context.api.listModels();
      expect(
        listModelResponse.models.some((model) => model.name.includes(MODEL)),
      ).toBe(true);
    },
    TEST_TIMEOUT,
  );
});
