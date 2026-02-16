import { describe, expect, it } from "vitest";
import type { Message } from "../../../chat";
import { AssistantMessage, UserMessage } from "../../../chat";
import { DefaultToolExecutionResult } from "../default-tool-execution-result";

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
