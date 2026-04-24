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

import type { ChatModel } from "@nestjs-ai/model";
import { assert, describe, expect, it } from "vitest";
import { ChatClient } from "../../chat-client.js";
import { FactCheckingEvaluator } from "../fact-checking-evaluator.js";

function createChatModel(): ChatModel {
  return {} as ChatModel;
}

describe("FactCheckingEvaluator", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () =>
        new FactCheckingEvaluator({
          chatClientBuilder: null as unknown as ChatClient.Builder,
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when evaluation prompt is null then use default evaluation prompt text", () => {
    const evaluator = new FactCheckingEvaluator({
      chatClientBuilder: ChatClient.builder(createChatModel()),
    });

    assert.exists(evaluator);
  });

  it("when for bespoke minicheck then use bespoke evaluation prompt text", () => {
    const evaluator = FactCheckingEvaluator.forBespokeMinicheck(
      ChatClient.builder(createChatModel()),
    );

    assert.exists(evaluator);
  });
});
