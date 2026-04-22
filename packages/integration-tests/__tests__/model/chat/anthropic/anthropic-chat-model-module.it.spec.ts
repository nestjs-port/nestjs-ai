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
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { type ChatResponse, Prompt } from "@nestjs-ai/model";
import {
  AnthropicChatModel,
  AnthropicChatModelModule,
  AnthropicChatOptions,
  type AnthropicChatProperties,
} from "@nestjs-ai/model-anthropic";
import { LoggerFactory } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, type Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { describe, expect, it } from "vitest";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicChatModelModuleIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory());
  const logger = LoggerFactory.getLogger("AnthropicChatModelModuleIT");

  it("chat call", async () => {
    const chatModel = await createChatModel({
      apiKey: ANTHROPIC_API_KEY ?? "",
    });

    const response = await chatModel.call("Hello");

    expect(response).not.toBeNull();
    expect(response ?? "").not.toHaveLength(0);
    logger.info("Response: %s", response);
  });

  it("generate streaming", async () => {
    const chatModel = await createChatModel({
      apiKey: ANTHROPIC_API_KEY ?? "",
    });

    const response = await collectChatResponseText(
      chatModel.stream(
        new Prompt("Hello", AnthropicChatOptions.builder().build()),
      ),
    );

    expect(response).not.toHaveLength(0);
    logger.info("Response: %s", response);
  });

  it("chat activation", async () => {
    const defaultChatModel = await createChatModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST_BASE_URL",
    });

    const defaultOptions = defaultChatModel.options;

    expect(defaultOptions.apiKey).toBe("API_KEY");
    expect(defaultOptions.baseUrl).toBe("http://TEST_BASE_URL");
    expect(defaultOptions.model).toBe(AnthropicChatOptions.DEFAULT_MODEL);

    const explicitChatModel = await createChatModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST_BASE_URL",
      options: {
        model: "claude-sonnet-4-20250514",
      },
    });

    expect(explicitChatModel.options.model).toBe("claude-sonnet-4-20250514");
  });
});

async function createChatModel(
  properties: AnthropicChatProperties,
): Promise<AnthropicChatModel> {
  const moduleRef = await Test.createTestingModule({
    imports: [AnthropicChatModelModule.forFeature(properties)],
  }).compile();

  return moduleRef.get<AnthropicChatModel>(CHAT_MODEL_TOKEN);
}

async function collectChatResponseText(
  stream: Observable<ChatResponse>,
): Promise<string> {
  let answer = "";
  await withTimeout(
    lastValueFrom(
      stream.pipe(
        tap((chatResponse) => {
          answer += chatResponse.result?.output.text ?? "";
        }),
      ),
    ),
    120_000,
  );
  return answer;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle != null) {
      clearTimeout(timeoutHandle);
    }
  }
}
