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
import { OpenAiSdkChatModel } from "../open-ai-sdk-chat-model";
import { OpenAiSdkChatOptions } from "../open-ai-sdk-chat-options";

function createChatModel(options: OpenAiSdkChatOptions): OpenAiSdkChatModel {
  return new OpenAiSdkChatModel({
    client: {} as OpenAI,
    options,
  });
}

describe("OpenAiSdkChatModel", () => {
  it("toolChoiceAuto", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .toolChoice("auto")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("auto");
  });

  it("toolChoiceNone", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .toolChoice("none")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("none");
  });

  it("toolChoiceRequired", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .toolChoice("required")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("required");
  });

  it("toolChoiceFunction", () => {
    const toolChoice = {
      type: "function",
      function: {
        name: "my_function",
      },
    } as const;
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .toolChoice(toolChoice)
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toEqual(toolChoice);
    expect(request.tool_choice).not.toBeNull();
    if (
      request.tool_choice == null ||
      typeof request.tool_choice === "string"
    ) {
      throw new Error("Expected named tool choice to be present");
    }
    expect(
      (request.tool_choice as { function: { name: string } }).function.name,
    ).toBe("my_function");
  });

  it("toolChoiceInvalidJson", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .toolChoice("invalid-json" as never)
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("invalid-json");
  });
});
