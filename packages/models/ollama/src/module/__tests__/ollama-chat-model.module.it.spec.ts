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
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { Prompt, UserMessage, type ChatResponse } from "@nestjs-ai/model";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lastValueFrom, type Observable, tap } from "rxjs";

import { OllamaChatOptions } from "../../api/ollama-chat-options.js";
import { OllamaModel } from "../../api/ollama-model.js";
import type { OllamaChatModel } from "../../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "../../__tests__/ollama-test-context.js";
import { OllamaApiModule } from "../ollama-api.module.js";
import { OllamaChatModelModule } from "../ollama-chat-model.module.js";
import type { OllamaChatProperties } from "../ollama-chat-properties.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_2_5_3B.name;
const USER_MESSAGE = new UserMessage({
  content: "What's the capital of Denmark?",
});

describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaChatModelModuleIT", () => {
  let context: OllamaTestContext;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "chatCompletion",
    async () => {
      const chatModel = await createChatModel(context, {
        options: OllamaChatOptions.builder()
          .model(MODEL)
          .temperature(0.5)
          .topK(10)
          .build(),
      });

      const response = await chatModel.call(new Prompt(USER_MESSAGE));
      expect(response.result?.output.text).toContain("Copenhagen");
    },
    TEST_TIMEOUT,
  );

  it(
    "chatCompletionStreaming",
    async () => {
      const chatModel = await createChatModel(context, {
        options: OllamaChatOptions.builder()
          .model(MODEL)
          .temperature(0.5)
          .topK(10)
          .build(),
      });

      const stitchedResponseContent = await collectChatResponseText(
        chatModel.stream(new Prompt(USER_MESSAGE)),
      );

      expect(stitchedResponseContent).toContain("Copenhagen");
    },
    TEST_TIMEOUT,
  );
});

async function createChatModule(
  context: OllamaTestContext,
  properties: OllamaChatProperties,
): Promise<TestingModule> {
  const apiModule = OllamaApiModule.forFeature({
    baseUrl: context.baseUrl,
  });

  return Test.createTestingModule({
    imports: [
      OllamaChatModelModule.forFeature(properties, {
        imports: [apiModule],
      }),
    ],
  }).compile();
}

async function createChatModel(
  context: OllamaTestContext,
  properties: OllamaChatProperties,
): Promise<OllamaChatModel> {
  const moduleRef = await createChatModule(context, properties);
  return moduleRef.get<OllamaChatModel>(CHAT_MODEL_TOKEN);
}

async function collectChatResponseText(
  stream: Observable<ChatResponse>,
): Promise<string> {
  let content = "";
  await lastValueFrom(
    stream.pipe(
      tap((chatResponse) => {
        content += chatResponse.results
          .map((generation) => generation.output.text)
          .join("");
      }),
    ),
  );
  return content;
}
