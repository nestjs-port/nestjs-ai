import {
  AssistantMessage,
  ChatModel,
  ChatResponse,
  Generation,
  type Prompt,
  type UserMessage,
} from "@nestjs-ai/model";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { ChatClient } from "../../chat-client";
import { SimpleLoggerAdvisor } from "../simple-logger-advisor";

class TestChatModel extends ChatModel {
  readonly callMock = vi.fn(async (prompt: Prompt): Promise<ChatResponse> => {
    this.lastCallPrompt = prompt;
    return createChatResponse("Your answer is ZXY");
  });

  readonly streamMock = vi.fn((prompt: Prompt) => {
    this.lastStreamPrompt = prompt;
    return of(createChatResponse("Your answer is ZXY"));
  });

  lastCallPrompt: Prompt | null = null;
  lastStreamPrompt: Prompt | null = null;

  override async call(prompt: Prompt): Promise<ChatResponse> {
    return this.callMock(prompt);
  }

  override stream(prompt: Prompt) {
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
    expect(prompt).not.toBeNull();
    const userMessage = prompt?.instructions[0] as UserMessage;
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
    expect(prompt).not.toBeNull();
    const userMessage = prompt?.instructions[0] as UserMessage;
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
