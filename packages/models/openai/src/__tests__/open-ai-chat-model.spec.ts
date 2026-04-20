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

import { Media, MediaFormat } from "@nestjs-ai/commons";
import { Prompt, UserMessage } from "@nestjs-ai/model";
import type { OpenAI } from "openai";
import { describe, expect, it } from "vitest";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";

function createChatModel(options: OpenAiChatOptions): OpenAiChatModel {
  return new OpenAiChatModel({
    client: {} as OpenAI,
    options,
  });
}

describe("OpenAiChatModel", () => {
  it("tool choice auto", () => {
    const options = OpenAiChatOptions.builder()
      .model("test-model")
      .toolChoice("auto")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("auto");
  });

  it("tool choice none", () => {
    const options = OpenAiChatOptions.builder()
      .model("test-model")
      .toolChoice("none")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("none");
  });

  it("tool choice required", () => {
    const options = OpenAiChatOptions.builder()
      .model("test-model")
      .toolChoice("required")
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("required");
  });

  it("tool choice function", () => {
    const toolChoice = {
      type: "function",
      function: {
        name: "my_function",
      },
    } as const;
    const options = OpenAiChatOptions.builder()
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

  it("tool choice invalid json", () => {
    const options = OpenAiChatOptions.builder()
      .model("test-model")
      .toolChoice("invalid-json" as never)
      .build();
    const chatModel = createChatModel(options);

    const request = chatModel.createRequest(new Prompt("test", options), false);
    expect(request.tool_choice).toBe("invalid-json");
  });

  it("image media url object is converted to string", () => {
    const options = OpenAiChatOptions.builder().model("test-model").build();
    const chatModel = createChatModel(options);
    const userMessage = new UserMessage({
      content: "Explain what do you see on this picture?",
      media: [
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: new URL(
            "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
          ),
        }),
      ],
    });

    const request = chatModel.createRequest(
      new Prompt([userMessage], options),
      false,
    );
    const content = request.messages[0]?.content;

    expect(Array.isArray(content)).toBe(true);
    const contentParts = content as Array<{
      type: string;
      image_url?: { url?: string };
    }>;
    const imagePart = contentParts.find((part) => part.type === "image_url") as
      | { image_url?: { url?: string } }
      | undefined;
    expect(imagePart?.image_url?.url).toBe(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );
  });
});
