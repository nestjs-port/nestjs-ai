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

import { Prompt } from "@nestjs-ai/model";
import type { OpenAI } from "openai";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../open-ai-chat-options.js";

function createChatModel(): OpenAiChatModel {
  return new OpenAiChatModel({ client: {} as OpenAI });
}

describe("OpenAiExtraBody", () => {
  it("extra body is mapped to additional body properties", () => {
    // Arrange
    const extraBodyParams: Record<string, unknown> = {
      top_k: 50,
      repetition_penalty: 1.1,
      best_of: 3,
    };

    const options = OpenAiChatOptions.builder()
      .model("test-model")
      .extraBody(extraBodyParams)
      .build();

    const prompt = new Prompt("Test prompt", options);
    const chatModel = createChatModel();

    // Act
    const createParams = chatModel.createRequest(
      prompt,
      false,
    ) as unknown as Record<string, unknown>;

    // Assert
    expect(createParams).not.toBeNull();
    expect(createParams).toHaveProperty("top_k");
    expect(createParams).toHaveProperty("repetition_penalty");
    expect(createParams).toHaveProperty("best_of");
    expect(createParams).not.toHaveProperty("extra_body");

    expect(createParams.top_k).toBe(50);
    expect(createParams.repetition_penalty).toBe(1.1);
    expect(createParams.best_of).toBe(3);
  });

  it("extra body is not mapped when null or empty", () => {
    // Null extra body
    const optionsNull = OpenAiChatOptions.builder().model("test-model").build();

    const promptNull = new Prompt("Test prompt", optionsNull);
    const chatModel = createChatModel();

    const createParamsNull = chatModel.createRequest(
      promptNull,
      false,
    ) as unknown as Record<string, unknown>;
    expect(createParamsNull).not.toHaveProperty("extra_body");

    // Empty extra body
    const optionsEmpty = OpenAiChatOptions.builder()
      .model("test-model")
      .extraBody({})
      .build();

    const promptEmpty = new Prompt("Test prompt", optionsEmpty);

    const createParamsEmpty = chatModel.createRequest(
      promptEmpty,
      false,
    ) as unknown as Record<string, unknown>;
    expect(createParamsEmpty).not.toHaveProperty("extra_body");
  });
});
