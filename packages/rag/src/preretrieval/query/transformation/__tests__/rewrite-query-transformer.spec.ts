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

import type { ChatClient } from "@nestjs-ai/client-chat";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import type { Query } from "../../../../query.js";
import type { QueryTransformer } from "../query-transformer.js";
import { RewriteQueryTransformer } from "../rewrite-query-transformer.js";

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
