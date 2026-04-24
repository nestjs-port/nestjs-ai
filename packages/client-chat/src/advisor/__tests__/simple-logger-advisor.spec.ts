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

import {
  AssistantMessage,
  ChatModel,
  ChatResponse,
  Generation,
  type Prompt,
} from "@nestjs-ai/model";
import { firstValueFrom, of } from "rxjs";
import { assert, describe, expect, it, vi } from "vitest";

import { ChatClient } from "../../chat-client.js";
import { SimpleLoggerAdvisor } from "../simple-logger-advisor.js";

class TestChatModel extends ChatModel {
  readonly chatPromptMock = vi.fn(
    async (prompt: Prompt): Promise<ChatResponse> => {
      this.lastCallPrompt = prompt;
      return createChatResponse("Your answer is ZXY");
    },
  );

  readonly streamMock = vi.fn((prompt: Prompt) => {
    this.lastStreamPrompt = prompt;
    return of(createChatResponse("Your answer is ZXY"));
  });

  lastCallPrompt: Prompt | null = null;
  lastStreamPrompt: Prompt | null = null;

  protected override async callPrompt(prompt: Prompt): Promise<ChatResponse> {
    return this.chatPromptMock(prompt);
  }

  protected override streamPrompt(prompt: Prompt) {
    return this.streamMock(prompt);
  }
}

describe("SimpleLoggerAdvisor", () => {
  it("call logging", async () => {
    const chatModel = new TestChatModel();
    const requestToString = vi.fn(() => "request");
    const responseToString = vi.fn(() => "response");
    const loggerAdvisor = new SimpleLoggerAdvisor({
      requestToString,
      responseToString,
    });

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(loggerAdvisor)
      .build();

    const content = await chatClient
      .prompt()
      .user("Please answer my question XYZ")
      .call()
      .content();

    expect(content).toBe("Your answer is ZXY");
    expect(requestToString).toHaveBeenCalledTimes(1);
    expect(responseToString).toHaveBeenCalledTimes(1);

    const prompt = chatModel.lastCallPrompt;
    assert.exists(prompt);
    assert.exists(prompt.instructions[0]);
    const userMessage = prompt.instructions[0];
    expect(userMessage.text).toBe("Please answer my question XYZ");
  });

  it("stream logging", async () => {
    const chatModel = new TestChatModel();
    const requestToString = vi.fn(() => "request");
    const responseToString = vi.fn(() => "response");
    const loggerAdvisor = new SimpleLoggerAdvisor({
      requestToString,
      responseToString,
    });

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(loggerAdvisor)
      .build();

    const content = await firstValueFrom(
      chatClient
        .prompt()
        .user("Please answer my question XYZ")
        .stream()
        .content(),
    );

    expect(content).toBe("Your answer is ZXY");
    expect(requestToString).toHaveBeenCalledTimes(1);
    expect(responseToString).toHaveBeenCalledTimes(1);

    const prompt = chatModel.lastStreamPrompt;
    assert.exists(prompt);
    assert.exists(prompt.instructions[0]);
    const userMessage = prompt.instructions[0];
    expect(userMessage.text).toBe("Please answer my question XYZ");
  });

  it("logging order", () => {
    const loggerAdvisor = new SimpleLoggerAdvisor(1);
    expect(loggerAdvisor.order).toBe(1);
  });
});

function createChatResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: AssistantMessage.of(content),
      }),
    ],
  });
}
