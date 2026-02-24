import type { ChatClient } from "@nestjs-ai/client-chat";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import type { Query } from "../../../../query";
import type { QueryTransformer } from "../query-transformer";
import { TranslationQueryTransformer } from "../translation-query-transformer";

const mockChatClientBuilder = (): ChatClient.Builder =>
  ({
    build: () => ({}) as ChatClient,
  }) as ChatClient.Builder;

describe("TranslationQueryTransformer", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () =>
        new TranslationQueryTransformer({
          chatClientBuilder: null as unknown as ChatClient.Builder,
          targetLanguage: "italian",
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when query is null then throw", async () => {
    const queryTransformer: QueryTransformer = new TranslationQueryTransformer({
      chatClientBuilder: mockChatClientBuilder(),
      targetLanguage: "italian",
    });

    await expect(
      queryTransformer.transform(null as unknown as Query),
    ).rejects.toThrow("query cannot be null");
  });

  it("when prompt has missing targetLanguage placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate("Translate {query}");

    expect(
      () =>
        new TranslationQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetLanguage: "italian",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new TranslationQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetLanguage: "italian",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("targetLanguage");
  });

  it("when prompt has missing query placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate(
      "Translate to {targetLanguage}",
    );

    expect(
      () =>
        new TranslationQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetLanguage: "italian",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new TranslationQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetLanguage: "italian",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("query");
  });
});
