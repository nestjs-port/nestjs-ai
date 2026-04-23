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
import { assert, describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModelAdditionalHttpHeaders", () => {
  const openAiChatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey("Invalid API Key")
      .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
      .build(),
  });

  it("additional api key header", async () => {
    await expect(openAiChatModel.call("Tell me a joke")).rejects.toThrow(/./);

    // Use the additional headers to override the Api Key.
    // Mind that you have to prefix the Api Key with the "Bearer " prefix.
    const options = OpenAiChatOptions.builder()
      .customHeaders({ Authorization: `Bearer ${OPENAI_API_KEY ?? ""}` })
      .build();

    const response = await openAiChatModel.call(
      new Prompt("Tell me a joke", options),
    );

    assert.exists(response);
  });
});
