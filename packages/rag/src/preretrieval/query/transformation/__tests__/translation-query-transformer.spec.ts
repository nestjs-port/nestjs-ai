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
