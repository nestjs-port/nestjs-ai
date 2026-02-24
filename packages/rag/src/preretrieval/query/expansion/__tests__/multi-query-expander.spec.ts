import type { ChatClient } from "@nestjs-ai/client-chat";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import type { Query } from "../../../../query";
import { MultiQueryExpander } from "../multi-query-expander";

const mockChatClientBuilder = (): ChatClient.Builder =>
  ({
    build: () => ({}) as ChatClient,
  }) as ChatClient.Builder;

describe("MultiQueryExpander", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () =>
        new MultiQueryExpander({
          chatClientBuilder: null as unknown as ChatClient.Builder,
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when query is null then throw", async () => {
    const queryExpander = new MultiQueryExpander({
      chatClientBuilder: mockChatClientBuilder(),
    });

    await expect(
      queryExpander.expand(null as unknown as Query),
    ).rejects.toThrow("query cannot be null");
  });

  it("when prompt has missing number placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate(
      "You are the boss. Original query: {query}",
    );

    expect(
      () =>
        new MultiQueryExpander({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("number");
  });

  it("when prompt has missing query placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate(
      "You are the boss. Number of queries: {number}",
    );

    expect(
      () =>
        new MultiQueryExpander({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("query");
  });

  it("when builder is null then throw", () => {
    expect(
      () =>
        new MultiQueryExpander({
          chatClientBuilder: null as unknown as ChatClient.Builder,
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when prompt template is null then use default", () => {
    const queryExpander = new MultiQueryExpander({
      chatClientBuilder: mockChatClientBuilder(),
      promptTemplate: null,
    });

    expect(queryExpander).toBeDefined();
  });

  it("when prompt template has both placeholders then build", () => {
    const validTemplate = new PromptTemplate(
      "Generate {number} variations of: {query}",
    );

    const expander = new MultiQueryExpander({
      chatClientBuilder: mockChatClientBuilder(),
      promptTemplate: validTemplate,
    });

    expect(expander).toBeDefined();
  });

  it("when prompt template has extra placeholders then build", () => {
    const templateWithExtra = new PromptTemplate(
      "Generate {number} variations of: {query}. Context: {context}",
    );

    const expander = new MultiQueryExpander({
      chatClientBuilder: mockChatClientBuilder(),
      promptTemplate: templateWithExtra,
    });

    expect(expander).toBeDefined();
  });

  it("when prompt template set to null after valid template then use default", () => {
    const expander = new MultiQueryExpander({
      chatClientBuilder: mockChatClientBuilder(),
    });

    expect(expander).toBeDefined();
  });

  it("when prompt template has placeholders in different case then throw", () => {
    const templateWithWrongCase = new PromptTemplate(
      "Generate {NUMBER} variations of: {QUERY}",
    );

    expect(
      () =>
        new MultiQueryExpander({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: templateWithWrongCase,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );
  });
});
