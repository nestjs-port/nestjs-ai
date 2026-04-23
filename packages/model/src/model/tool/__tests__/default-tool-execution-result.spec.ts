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

import { describe, expect, it } from "vitest";
import type { Message } from "../../../chat/index.js";
import { AssistantMessage, UserMessage } from "../../../chat/index.js";
import { DefaultToolExecutionResult } from "../default-tool-execution-result.js";

describe("DefaultToolExecutionResult", () => {
  it("when conversation history is null then throw", () => {
    expect(() => {
      new DefaultToolExecutionResult({
        conversationHistory: null as unknown as Message[],
      });
    }).toThrow("conversationHistory cannot be null");
  });

  it("when conversation history has null elements then throw", () => {
    const history: Message[] = [null as unknown as Message];
    expect(() => {
      new DefaultToolExecutionResult({
        conversationHistory: history,
      });
    }).toThrow("conversationHistory cannot contain null elements");
  });

  it("creates result with conversation history and return direct", () => {
    const conversationHistory: Message[] = [];
    const result = new DefaultToolExecutionResult({
      conversationHistory,
      returnDirect: true,
    });
    expect(result.conversationHistory()).toEqual(conversationHistory);
    expect(result.returnDirect()).toBe(true);
  });

  it("creates result with minimal required fields", () => {
    const conversationHistory: Message[] = [];
    const result = new DefaultToolExecutionResult({
      conversationHistory,
    });

    expect(result.conversationHistory()).toEqual(conversationHistory);
    expect(result.returnDirect()).toBe(false);
  });

  it("creates result with return direct false", () => {
    const conversationHistory: Message[] = [];
    const result = new DefaultToolExecutionResult({
      conversationHistory,
      returnDirect: false,
    });

    expect(result.conversationHistory()).toEqual(conversationHistory);
    expect(result.returnDirect()).toBe(false);
  });

  it("when conversation history is empty", () => {
    const conversationHistory: Message[] = [];
    const result = new DefaultToolExecutionResult({
      conversationHistory,
      returnDirect: true,
    });

    expect(result.conversationHistory()).toHaveLength(0);
    expect(result.returnDirect()).toBe(true);
  });

  it("when conversation history has multiple messages", () => {
    const conversationHistory = [
      UserMessage.of("Hello"),
      AssistantMessage.of("Hi there!"),
    ];

    const result = new DefaultToolExecutionResult({
      conversationHistory,
      returnDirect: false,
    });

    expect(result.conversationHistory()).toHaveLength(2);
    expect(result.conversationHistory()).toEqual([
      conversationHistory[0],
      conversationHistory[1],
    ]);
    expect(result.returnDirect()).toBe(false);
  });

  it("when conversation history has null elements in middle", () => {
    const history: Message[] = [
      UserMessage.of("First message"),
      null as unknown as Message,
      AssistantMessage.of("Last message"),
    ];

    expect(() => {
      new DefaultToolExecutionResult({
        conversationHistory: history,
      });
    }).toThrow("conversationHistory cannot contain null elements");
  });

  it("when conversation history has multiple null elements", () => {
    const history: Message[] = [
      null as unknown as Message,
      null as unknown as Message,
      UserMessage.of("Valid message"),
    ];

    expect(() => {
      new DefaultToolExecutionResult({
        conversationHistory: history,
      });
    }).toThrow("conversationHistory cannot contain null elements");
  });

  it("when conversation history is modified after building", () => {
    const conversationHistory: Message[] = [UserMessage.of("Original")];

    const result = new DefaultToolExecutionResult({
      conversationHistory,
    });

    conversationHistory.push(AssistantMessage.of("Added later"));

    expect(result.conversationHistory()).toHaveLength(2);
    expect(result.conversationHistory()[0]).toEqual(conversationHistory[0]);
  });
});
