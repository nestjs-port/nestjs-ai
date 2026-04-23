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
  type ChatModel,
  ChatOptions,
  ChatResponse,
  Generation,
  type Prompt,
} from "@nestjs-ai/model";
import { lastValueFrom, map, of, reduce, tap } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatClient } from "../../chat-client.js";
import type { ChatClientRequest } from "../../chat-client-request.js";
import type { ChatClientResponse } from "../../chat-client-response.js";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "../api/index.js";

describe("Advisors", () => {
  let chatModel: ChatModel;

  beforeEach(() => {
    chatModel = {
      call: vi.fn(),
      stream: vi.fn(),
      defaultOptions: ChatOptions.builder().build(),
    } as unknown as ChatModel;
  });

  it("call advisors context propagation", async () => {
    let capturedPrompt = {} as Prompt;

    // Order==0 has higher priority thant order == 1. The lower the order the higher
    // the priority.
    const mockAroundAdvisor1 = new MockAroundAdvisor("Advisor1", 0);
    const mockAroundAdvisor2 = new MockAroundAdvisor("Advisor2", 1);

    vi.mocked(chatModel.call).mockImplementation(async (prompt: Prompt) => {
      capturedPrompt = prompt;
      return createResponse("Hello John");
    });

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text.")
      .defaultAdvisors(mockAroundAdvisor1)
      .build();

    const content = await chatClient
      .prompt()
      .user("my name is John")
      .advisors(mockAroundAdvisor2)
      .advisors((a) =>
        a.param("key1", "value1").params(new Map([["key2", "value2"]])),
      )
      .call()
      .content();

    expect(content).toBe("Hello John");

    // AROUND
    expect(mockAroundAdvisor1.chatClientResponse?.chatResponse).not.toBeNull();
    const context = mockAroundAdvisor1.chatClientResponse?.context;
    expect(context).toBeDefined();
    expect(context?.get("key1")).toBe("value1");
    expect(context?.get("key2")).toBe("value2");
    expect(context?.get("aroundCallBeforeAdvisor1")).toBe(
      "AROUND_CALL_BEFORE Advisor1",
    );
    expect(context?.get("aroundCallAfterAdvisor1")).toBe(
      "AROUND_CALL_AFTER Advisor1",
    );
    expect(context?.get("aroundCallBeforeAdvisor2")).toBe(
      "AROUND_CALL_BEFORE Advisor2",
    );
    expect(context?.get("aroundCallAfterAdvisor2")).toBe(
      "AROUND_CALL_AFTER Advisor2",
    );
    expect(context?.get("lastBefore")).toBe("Advisor2"); // inner
    expect(context?.get("lastAfter")).toBe("Advisor1"); // outer

    expect(chatModel.call).toHaveBeenCalled();
    expect(capturedPrompt.instructions).toBeDefined();
  });

  it("stream advisors context propagation", async () => {
    let capturedPrompt = {} as Prompt;

    const mockAroundAdvisor1 = new MockAroundAdvisor("Advisor1", 0);
    const mockAroundAdvisor2 = new MockAroundAdvisor("Advisor2", 1);

    vi.mocked(chatModel.stream).mockImplementation((prompt: Prompt) => {
      capturedPrompt = prompt;
      return of(createResponse("Hello"), createResponse(" John"));
    });

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text.")
      .defaultAdvisors(mockAroundAdvisor1)
      .build();

    const content = await lastValueFrom(
      chatClient
        .prompt()
        .user("my name is John")
        .advisors((a) =>
          a.param("key1", "value1").params(new Map([["key2", "value2"]])),
        )
        .advisors(mockAroundAdvisor2)
        .stream()
        .content()
        .pipe(reduce((acc, value) => acc + value, "")),
    );

    expect(content).toBe("Hello John");

    // AROUND
    expect(mockAroundAdvisor1.advisedChatClientResponses).not.toHaveLength(0);

    for (const chatClientResponse of mockAroundAdvisor1.advisedChatClientResponses) {
      const context = chatClientResponse.context;
      expect(context.get("key1")).toBe("value1");
      expect(context.get("key2")).toBe("value2");
      expect(context.get("aroundStreamBeforeAdvisor1")).toBe(
        "AROUND_STREAM_BEFORE Advisor1",
      );
      expect(context.get("aroundStreamAfterAdvisor1")).toBe(
        "AROUND_STREAM_AFTER Advisor1",
      );
      expect(context.get("aroundStreamBeforeAdvisor2")).toBe(
        "AROUND_STREAM_BEFORE Advisor2",
      );
      expect(context.get("aroundStreamAfterAdvisor2")).toBe(
        "AROUND_STREAM_AFTER Advisor2",
      );
      expect(context.get("lastBefore")).toBe("Advisor2"); // inner
      expect(context.get("lastAfter")).toBe("Advisor1"); // outer
    }

    expect(chatModel.stream).toHaveBeenCalled();
    expect(capturedPrompt.instructions).toBeDefined();
  });
});

class MockAroundAdvisor implements CallAdvisor, StreamAdvisor {
  chatClientRequest: ChatClientRequest | null = null;
  chatClientResponse: ChatClientResponse | null = null;
  advisedChatClientResponses: ChatClientResponse[] = [];

  constructor(
    private readonly _name: string,
    private readonly _order: number,
  ) {}

  get name(): string {
    return this._name;
  }

  get order(): number {
    return this._order;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    this.chatClientRequest = chatClientRequest
      .mutate()
      .context(
        new Map([
          [`aroundCallBefore${this.name}`, `AROUND_CALL_BEFORE ${this.name}`],
          ["lastBefore", this.name],
        ]),
      )
      .build();

    const chatClientResponse = await callAdvisorChain.nextCall(
      this.chatClientRequest,
    );

    this.chatClientResponse = chatClientResponse
      .mutate()
      .context(
        new Map([
          [`aroundCallAfter${this.name}`, `AROUND_CALL_AFTER ${this.name}`],
          ["lastAfter", this.name],
        ]),
      )
      .build();

    return this.chatClientResponse;
  }

  adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ) {
    this.chatClientRequest = chatClientRequest
      .mutate()
      .context(
        new Map([
          [
            `aroundStreamBefore${this.name}`,
            `AROUND_STREAM_BEFORE ${this.name}`,
          ],
          ["lastBefore", this.name],
        ]),
      )
      .build();

    return streamAdvisorChain.nextStream(this.chatClientRequest).pipe(
      map((chatClientResponse) =>
        chatClientResponse
          .mutate()
          .context(
            new Map([
              [
                `aroundStreamAfter${this.name}`,
                `AROUND_STREAM_AFTER ${this.name}`,
              ],
              ["lastAfter", this.name],
            ]),
          )
          .build(),
      ),
      tap((value) => {
        this.advisedChatClientResponses.push(value);
      }),
    );
  }
}

function createResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}
