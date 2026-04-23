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

import {
  AssistantMessage,
  type ChatModel,
  ChatResponse,
  DefaultToolCallingChatOptions,
  Generation,
  type Prompt,
} from "@nestjs-ai/model";
import { finalize, interval, map, of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { ChatClient } from "../chat-client.js";

describe("ChatClient stream iterable", () => {
  it("contentIterable emits all chunks in order", async () => {
    const chatModel = createStreamingChatModel(["Hello", " ", "world"]);
    const chatClient = ChatClient.builder(chatModel).build();

    const chunks: string[] = [];
    for await (const chunk of chatClient
      .prompt({ user: "hi" })
      .stream()
      .contentIterable()) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " ", "world"]);
  });

  it("chatResponseIterable emits aggregated ChatResponse values", async () => {
    const chatModel = createStreamingChatModel(["a", "b"]);
    const chatClient = ChatClient.builder(chatModel).build();

    const responses: string[] = [];
    for await (const response of chatClient
      .prompt({ user: "hi" })
      .stream()
      .chatResponseIterable()) {
      responses.push(response.result?.output?.text ?? "");
    }

    expect(responses).toEqual(["a", "b"]);
  });

  it("chatClientResponseIterable wraps ChatClientResponse", async () => {
    const chatModel = createStreamingChatModel(["x"]);
    const chatClient = ChatClient.builder(chatModel).build();

    let count = 0;
    for await (const response of chatClient
      .prompt({ user: "hi" })
      .stream()
      .chatClientResponseIterable()) {
      expect(response.chatResponse).toBeDefined();
      count++;
    }

    expect(count).toBeGreaterThan(0);
  });

  it("break unsubscribes from the upstream observable", async () => {
    const finalized = vi.fn();
    const chatModel = {
      call: vi.fn(),
      stream: vi.fn(() =>
        interval(0).pipe(
          map((i) => toChatResponse(`chunk-${i}`)),
          finalize(finalized),
        ),
      ),
      get defaultOptions() {
        return new DefaultToolCallingChatOptions();
      },
    } as unknown as ChatModel;
    const chatClient = ChatClient.builder(chatModel).build();

    const received: string[] = [];
    for await (const chunk of chatClient
      .prompt({ user: "hi" })
      .stream()
      .contentIterable()) {
      received.push(chunk);
      if (received.length === 2) break;
    }

    expect(received).toHaveLength(2);
    expect(finalized).toHaveBeenCalledTimes(1);
  });

  it("propagates upstream errors as a thrown rejection", async () => {
    const chatModel = {
      call: vi.fn(),
      stream: vi.fn(() => throwError(() => new Error("boom"))),
      get defaultOptions() {
        return new DefaultToolCallingChatOptions();
      },
    } as unknown as ChatModel;
    const chatClient = ChatClient.builder(chatModel).build();

    await expect(async () => {
      for await (const _ of chatClient
        .prompt({ user: "hi" })
        .stream()
        .contentIterable()) {
        // drain
      }
    }).rejects.toThrow("boom");
  });

  it("buffers values emitted before the consumer requests them", async () => {
    const chatModel = createStreamingChatModel(["one", "two", "three"]);
    const chatClient = ChatClient.builder(chatModel).build();

    const iterable = chatClient
      .prompt({ user: "hi" })
      .stream()
      .contentIterable();
    const iterator = iterable[Symbol.asyncIterator]();

    await new Promise((resolve) => setImmediate(resolve));

    const first = await iterator.next();
    const second = await iterator.next();
    const third = await iterator.next();
    const end = await iterator.next();

    expect(first).toEqual({ value: "one", done: false });
    expect(second).toEqual({ value: "two", done: false });
    expect(third).toEqual({ value: "three", done: false });
    expect(end).toEqual({ value: undefined, done: true });
  });
});

function createStreamingChatModel(chunks: string[]): ChatModel {
  return {
    call: vi.fn(),
    stream: vi.fn((_prompt: Prompt) => of(...chunks.map(toChatResponse))),
    get defaultOptions() {
      return new DefaultToolCallingChatOptions();
    },
  } as unknown as ChatModel;
}

function toChatResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}
