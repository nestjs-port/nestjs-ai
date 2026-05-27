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

import { Media, MediaFormat } from "@nestjs-ai/commons";
import { Prompt, UserMessage } from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { LoggerFactory } from "@nestjs-port/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.GEMMA3.name;

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaChatModelMultimodalIT", () => {
  const logger = LoggerFactory.getLogger("OllamaChatModelMultimodalIT");
  let context: OllamaTestContext;
  let chatModel: OllamaChatModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    chatModel = new OllamaChatModel({
      ollamaApi: context.api,
      defaultOptions: OllamaChatOptions.builder()
        .model(MODEL)
        .temperature(0.9)
        .build(),
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "unsupported media type",
    async () => {
      const imageData = new URL("something.adoc", import.meta.url);

      const userMessage = new UserMessage({
        content: "Explain what do you see in this picture?",
        media: [
          new Media({ mimeType: MediaFormat.IMAGE_PNG, data: imageData }),
        ],
      });

      await expect(chatModel.call(new Prompt([userMessage]))).rejects.toThrow(
        "illegal base64 data at input byte 4",
      );
    },
    TEST_TIMEOUT,
  );

  it(
    "multi modality test",
    async () => {
      const imageData = readFileSync(new URL("test.png", import.meta.url));

      const userMessage = new UserMessage({
        content: "Explain what do you see in this picture?",
        media: [
          new Media({ mimeType: MediaFormat.IMAGE_PNG, data: imageData }),
        ],
      });

      const response = await chatModel.call(new Prompt([userMessage]));

      logger.info(response.result?.output.text ?? "");
      expect(response.result?.output.text ?? "").toMatch(
        /bananas|apple|bowl|basket|fruit stand/i,
      );
    },
    TEST_TIMEOUT,
  );
});
