import type { ChatClient } from "@nestjs-ai/client-chat";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import type { Query } from "../../../../query";
import type { QueryTransformer } from "../query-transformer";
import { RewriteQueryTransformer } from "../rewrite-query-transformer";

const mockChatClientBuilder = (): ChatClient.Builder =>
  ({
    build: () => ({}) as ChatClient,
  }) as ChatClient.Builder;

describe("RewriteQueryTransformer", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () =>
        new RewriteQueryTransformer({
          chatClientBuilder: null as unknown as ChatClient.Builder,
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when query is null then throw", async () => {
    const queryTransformer: QueryTransformer = new RewriteQueryTransformer({
      chatClientBuilder: mockChatClientBuilder(),
    });

    await expect(
      queryTransformer.transform(null as unknown as Query),
    ).rejects.toThrow("query cannot be null");
  });

  it("when prompt has missing target placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate("Rewrite {query}");

    expect(
      () =>
        new RewriteQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetSearchSystem: "vector store",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new RewriteQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetSearchSystem: "vector store",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("target");
  });

  it("when prompt has missing query placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate("Rewrite for {target}");

    expect(
      () =>
        new RewriteQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetSearchSystem: "search engine",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new RewriteQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          targetSearchSystem: "search engine",
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("query");
  });
});
