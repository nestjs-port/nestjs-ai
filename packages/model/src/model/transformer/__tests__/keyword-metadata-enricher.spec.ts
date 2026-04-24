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

import { Document } from "@nestjs-ai/commons";
import type { ChatModel } from "../../../chat/index.js";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  type Prompt,
  PromptTemplate,
} from "../../../chat/index.js";
import { TemplateRendererFactory } from "@nestjs-ai/commons";
import { KeywordMetadataEnricher } from "../keyword-metadata-enricher.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CUSTOM_TEMPLATE = "Custom template: {context_str}";

function createResponse(responseText: string | null): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({
          content: responseText,
          media: [],
        }),
      }),
    ],
  });
}

function createChatModel(call: ReturnType<typeof vi.fn>): ChatModel {
  return { call } as unknown as ChatModel;
}

function getDefaultTemplatePromptText(
  keywordCount: number,
  documentContent: string,
): string {
  const promptTemplate = new PromptTemplate(
    KeywordMetadataEnricher.KEYWORDS_TEMPLATE.replace(
      "%s",
      String(keywordCount),
    ),
  );
  const prompt = promptTemplate.create({
    [KeywordMetadataEnricher.CONTEXT_STR_PLACEHOLDER]: documentContent,
  });
  return prompt.contents;
}

describe("KeywordMetadataEnricher", () => {
  beforeEach(() => {
    TemplateRendererFactory.reset();
  });

  it("testUseWithDefaultTemplate", async () => {
    // 1. Prepare test data
    const documents = [
      new Document("content1"),
      new Document("content2"),
      new Document("content3"),
    ];
    const keywordCount = 3;

    // 2. Mock
    const call = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse("keyword1-1, keyword1-2, keyword1-3"),
      )
      .mockResolvedValueOnce(
        createResponse("keyword2-1, keyword2-2, keyword2-3"),
      )
      .mockResolvedValueOnce(
        createResponse("keyword3-1, keyword3-2, keyword3-3"),
      );

    // 3. Create instance
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount,
    });

    // 4. Apply
    await keywordMetadataEnricher.apply(documents);

    // 5. Assert
    expect(call).toHaveBeenCalledTimes(3);
    expect((call.mock.calls[0]![0] as Prompt).userMessage.text).toBe(
      getDefaultTemplatePromptText(keywordCount, "content1"),
    );
    expect((call.mock.calls[1]![0] as Prompt).userMessage.text).toBe(
      getDefaultTemplatePromptText(keywordCount, "content2"),
    );
    expect((call.mock.calls[2]![0] as Prompt).userMessage.text).toBe(
      getDefaultTemplatePromptText(keywordCount, "content3"),
    );

    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword1-1, keyword1-2, keyword1-3",
    );
    expect(documents[1]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword2-1, keyword2-2, keyword2-3",
    );
    expect(documents[2]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword3-1, keyword3-2, keyword3-3",
    );
  });

  it("testUseCustomTemplate", async () => {
    // 1. Prepare test data
    const documents = [
      new Document("content1"),
      new Document("content2"),
      new Document("content3"),
    ];
    const promptTemplate = new PromptTemplate(CUSTOM_TEMPLATE);

    // 2. Mock
    const call = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse("keyword1-1, keyword1-2, keyword1-3"),
      )
      .mockResolvedValueOnce(
        createResponse("keyword2-1, keyword2-2, keyword2-3"),
      )
      .mockResolvedValueOnce(
        createResponse("keyword3-1, keyword3-2, keyword3-3"),
      );

    // 3. Create instance
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordsTemplate: promptTemplate,
    });

    // 4. Apply
    await keywordMetadataEnricher.apply(documents);

    // 5. Assert
    expect(call).toHaveBeenCalledTimes(documents.length);
    expect((call.mock.calls[0]![0] as Prompt).userMessage.text).toBe(
      "Custom template: content1",
    );
    expect((call.mock.calls[1]![0] as Prompt).userMessage.text).toBe(
      "Custom template: content2",
    );
    expect((call.mock.calls[2]![0] as Prompt).userMessage.text).toBe(
      "Custom template: content3",
    );

    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword1-1, keyword1-2, keyword1-3",
    );
    expect(documents[1]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword2-1, keyword2-2, keyword2-3",
    );
    expect(documents[2]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "keyword3-1, keyword3-2, keyword3-3",
    );
  });

  it("testConstructorThrowsException", () => {
    const chatModel = createChatModel(vi.fn());

    expect(
      () =>
        new KeywordMetadataEnricher({
          chatModel: null as unknown as ChatModel,
          keywordCount: 3,
        }),
    ).toThrow("chatModel must not be null");

    expect(
      () =>
        new KeywordMetadataEnricher({
          chatModel,
          keywordCount: 0,
        }),
    ).toThrow("keywordCount must be >= 1");

    expect(
      () =>
        new KeywordMetadataEnricher({
          chatModel,
          keywordsTemplate: null,
        }),
    ).toThrow("keywordsTemplate must not be null");
  });

  it("testConstructorWithKeywordCount", () => {
    const chatModel = createChatModel(vi.fn());
    const keywordCount = 3;

    const enricher = new KeywordMetadataEnricher({
      chatModel,
      keywordCount,
    });

    expect(enricher.getKeywordsTemplate().template).toBe(
      String(KeywordMetadataEnricher.KEYWORDS_TEMPLATE).replace(
        "%s",
        String(keywordCount),
      ),
    );
  });

  it("testConstructorWithKeywordsTemplate", () => {
    const chatModel = createChatModel(vi.fn());
    const template = new PromptTemplate(CUSTOM_TEMPLATE);

    const enricher = new KeywordMetadataEnricher({
      chatModel,
      keywordsTemplate: template,
    });

    expect(enricher.getKeywordsTemplate()).toBe(template);
  });

  it("testConstructorWithBothKeywordCountAndTemplate", () => {
    const chatModel = createChatModel(vi.fn());
    const customTemplate = new PromptTemplate(CUSTOM_TEMPLATE);

    const enricher = new KeywordMetadataEnricher({
      chatModel,
      keywordCount: 5,
      keywordsTemplate: customTemplate,
    });

    expect(enricher.getKeywordsTemplate()).toBe(customTemplate);
  });

  it("testApplyWithEmptyDocumentsList", async () => {
    const call = vi.fn();
    const chatModel = createChatModel(call);
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel,
      keywordCount: 3,
    });

    await keywordMetadataEnricher.apply([]);

    expect(call).not.toHaveBeenCalled();
  });

  it("testApplyWithSingleDocument", async () => {
    const documents = [new Document("single content")];
    const call = vi
      .fn()
      .mockResolvedValue(
        createResponse("single, keyword, test, document, content"),
      );
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 5,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(call).toHaveBeenCalledTimes(1);
    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "single, keyword, test, document, content",
    );
  });

  it("testApplyWithDocumentContainingExistingMetadata", async () => {
    const document = new Document("content with existing metadata");
    document.metadata.existing_key = "existing_value";
    const documents = [document];
    const call = vi.fn().mockResolvedValue(createResponse("new, keywords"));
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 2,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(documents[0]!.metadata).toHaveProperty(
      "existing_key",
      "existing_value",
    );
    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "new, keywords",
    );
  });

  it("testApplyWithEmptyStringResponse", async () => {
    const documents = [new Document("content")];
    const call = vi.fn().mockResolvedValue(createResponse(""));
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 3,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "",
    );
  });

  it("testApplyWithWhitespaceOnlyResponse", async () => {
    const documents = [new Document("content")];
    const call = vi.fn().mockResolvedValue(createResponse("   \n\t   "));
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 3,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "   \n\t   ",
    );
  });

  it("testApplyOverwritesExistingKeywords", async () => {
    const document = new Document("content");
    document.metadata[KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY] =
      "old, keywords";
    const documents = [document];
    const call = vi.fn().mockResolvedValue(createResponse("new, keywords"));
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 2,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "new, keywords",
    );
  });

  it("testApplyWithSpecialCharactersInContent", async () => {
    const documents = [new Document("Content with special chars: @#$%^&*()")];
    const call = vi
      .fn()
      .mockResolvedValue(createResponse("special, characters, content"));
    const keywordMetadataEnricher = new KeywordMetadataEnricher({
      chatModel: createChatModel(call),
      keywordCount: 3,
    });

    await keywordMetadataEnricher.apply(documents);

    expect(call).toHaveBeenCalledTimes(1);
    expect((call.mock.calls[0]![0] as Prompt).userMessage.text).toContain(
      "Content with special chars: @#$%^&*()",
    );
    expect(documents[0]!.metadata).toHaveProperty(
      KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY,
      "special, characters, content",
    );
  });
});
