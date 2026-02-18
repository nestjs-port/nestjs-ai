import { type ChatModel, PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClient } from "../../../chat-client";
import { RelevancyEvaluator } from "../relevancy-evaluator";

function createChatModel(): ChatModel {
  return {} as ChatModel;
}

describe("RelevancyEvaluator", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () => new RelevancyEvaluator(null as unknown as ChatClient.Builder),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when prompt template is null then use default", () => {
    const evaluator = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
    );
    expect(evaluator).toBeDefined();

    const evaluatorWithNullPrompt = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
      null,
    );
    expect(evaluatorWithNullPrompt).toBeDefined();
  });

  it("when prompt template is provided then use it", () => {
    const evaluator = new RelevancyEvaluator(
      ChatClient.builder(createChatModel()),
      new PromptTemplate("Question: {query}"),
    );

    expect(evaluator).toBeDefined();
  });
});
