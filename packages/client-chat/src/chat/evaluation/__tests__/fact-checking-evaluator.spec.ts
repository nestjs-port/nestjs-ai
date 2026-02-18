import type { ChatModel } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClient } from "../../../chat-client";
import { FactCheckingEvaluator } from "../fact-checking-evaluator";

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

    expect(evaluator).toBeDefined();
  });

  it("when for bespoke minicheck then use bespoke evaluation prompt text", () => {
    const evaluator = FactCheckingEvaluator.forBespokeMinicheck(
      ChatClient.builder(createChatModel()),
    );

    expect(evaluator).toBeDefined();
  });
});
