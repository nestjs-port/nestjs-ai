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

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "../../__tests__/ollama-test-context.js";
import { OllamaModel } from "../../api/ollama-model.js";
import { OllamaModelManager } from "../ollama-model-manager.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.NOMIC_EMBED_TEXT.name;

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaModelManagerIT", () => {
  let context: OllamaTestContext;
  let modelManager: OllamaModelManager;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    modelManager = new OllamaModelManager({ ollamaApi: context.api });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "when model available return true",
    async () => {
      await expect(modelManager.isModelAvailable(MODEL)).resolves.toBe(true);
      await expect(
        modelManager.isModelAvailable(`${MODEL}:latest`),
      ).resolves.toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "when model not available return false",
    async () => {
      await expect(modelManager.isModelAvailable("aleph")).resolves.toBe(false);
    },
    TEST_TIMEOUT,
  );
});
