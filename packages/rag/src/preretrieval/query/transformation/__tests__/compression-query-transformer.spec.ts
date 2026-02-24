import type { ChatClient } from "@nestjs-ai/client-chat";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import type { Query } from "../../../../query";
import { CompressionQueryTransformer } from "../compression-query-transformer";
import type { QueryTransformer } from "../query-transformer";

const mockChatClientBuilder = (): ChatClient.Builder =>
  ({
    build: () => ({}) as ChatClient,
  }) as ChatClient.Builder;

describe("CompressionQueryTransformer", () => {
  it("when chat client builder is null then throw", () => {
    expect(
      () =>
        new CompressionQueryTransformer({
          chatClientBuilder: null as unknown as ChatClient.Builder,
        }),
    ).toThrow("chatClientBuilder cannot be null");
  });

  it("when query is null then throw", async () => {
    const queryTransformer: QueryTransformer = new CompressionQueryTransformer({
      chatClientBuilder: mockChatClientBuilder(),
    });

    await expect(
      queryTransformer.transform(null as unknown as Query),
    ).rejects.toThrow("query cannot be null");
  });

  it("when prompt has missing history placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate("Compress {query}");

    expect(
      () =>
        new CompressionQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new CompressionQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("history");
  });

  it("when prompt has missing query placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate("Compress {history}");

    expect(
      () =>
        new CompressionQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template",
    );

    expect(
      () =>
        new CompressionQueryTransformer({
          chatClientBuilder: mockChatClientBuilder(),
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow("query");
  });
});
