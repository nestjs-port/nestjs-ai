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

import { type ChatModel, PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClient } from "../../chat-client.js";
import { RelevancyEvaluator } from "../relevancy-evaluator.js";

function createChatModel(): ChatModel {
  return {} as ChatModel;
}

describe("RelevancyEvaluator", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () => new RelevancyEvaluator(null as unknown as ChatClient.Builder),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when prompt template is null then use default", () => {
    const evaluator = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
    );
    expect(evaluator).toBeDefined();

    const evaluatorWithNullPrompt = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
      null,
    );
    expect(evaluatorWithNullPrompt).toBeDefined();
  });

  it("when prompt template is provided then use it", () => {
    const evaluator = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
      new PromptTemplate("Question: {query}"),
    );

    expect(evaluator).toBeDefined();
  });
});
