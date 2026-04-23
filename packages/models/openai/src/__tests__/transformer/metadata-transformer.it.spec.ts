/*
 * Copyright 2026-present the original author or authors.
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

import {
  ContentFormatTransformer,
  DefaultContentFormatter,
  Document,
} from "@nestjs-ai/commons";
import {
  KeywordMetadataEnricher,
  SummaryMetadataEnricher,
  SummaryType,
} from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("MetadataTransformerIT", () => {
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  const defaultContentFormatter = DefaultContentFormatter.builder()
    .withExcludedEmbedMetadataKeys("NewEmbedKey")
    .withExcludedInferenceMetadataKeys("NewInferenceKey")
    .build();

  const keywordMetadataEnricher = new KeywordMetadataEnricher({
    chatModel,
    keywordCount: 5,
  });
  const summaryMetadataEnricher = new SummaryMetadataEnricher(chatModel, [
    SummaryType.PREVIOUS,
    SummaryType.CURRENT,
    SummaryType.NEXT,
  ]);
  const contentFormatTransformer = new ContentFormatTransformer(
    defaultContentFormatter,
  );

  let document1: Document;
  let document2: Document;

  beforeEach(() => {
    document1 = new Document(
      "Somewhere in the Andes, they believe to this very day that the" +
        " future is behind you. It comes up from behind your back, surprising and unforeseeable, while the past " +
        " is always before your eyes, that which has already happened. When they talk about the past, the people of" +
        " the Aymara tribe point in front of them. You walk forward facing the past and you turn back toward the future.",
      { key: "value" },
    );

    document2 = new Document(
      "The Spring Framework is divided into modules. Applications can choose which modules" +
        " they need. At the heart are the modules of the core container, including a configuration generative and a " +
        "dependency injection mechanism. Beyond that, the Spring Framework provides foundational support " +
        " for different application architectures, including messaging, transactional data and persistence, " +
        "and web. It also includes the Servlet-based Spring MVC web framework and, in parallel, the Spring " +
        "WebFlux reactive web framework.",
    );
  });

  it("test keyword extractor", async () => {
    const updatedDocuments = await keywordMetadataEnricher.apply([
      document1,
      document2,
    ]);

    const keywords = updatedDocuments.map((d) => d.metadata);

    expect(updatedDocuments.length).toBe(2);
    const keywords1 = keywords[0]!;
    const keywords2 = keywords[1]!;
    expect(keywords1).toHaveProperty("excerpt_keywords");
    expect(keywords2).toHaveProperty("excerpt_keywords");

    expect(keywords1.excerpt_keywords as string).toContain("Andes");
    expect(keywords1.excerpt_keywords as string).toContain("Aymara");
    const keywords2Lower = (keywords2.excerpt_keywords as string).toLowerCase();
    expect(
      keywords2Lower.includes("spring mvc") ||
        keywords2Lower.includes("dependency injection"),
    ).toBe(true);
  });

  it("test summary extractor", async () => {
    const updatedDocuments = await summaryMetadataEnricher.apply([
      document1,
      document2,
    ]);

    const summaries = updatedDocuments.map((d) => d.metadata);

    expect(summaries.length).toBe(2);
    const summary1 = summaries[0]!;
    const summary2 = summaries[1]!;
    expect(summary1).toHaveProperty("section_summary");
    expect(summary1).toHaveProperty("next_section_summary");
    expect(summary1).not.toHaveProperty("prev_section_summary");
    expect(summary2).toHaveProperty("section_summary");
    expect(summary2).toHaveProperty("prev_section_summary");
    expect(summary2).not.toHaveProperty("next_section_summary");

    expect(summary1.section_summary as string).not.toBe("");
    expect(summary1.next_section_summary as string).not.toBe("");
    expect(summary2.section_summary as string).not.toBe("");
    expect(summary2.prev_section_summary as string).not.toBe("");

    expect(summary1.section_summary as string).toBe(
      summary2.prev_section_summary as string,
    );
    expect(summary1.next_section_summary as string).toBe(
      summary2.section_summary as string,
    );
  });

  it("test content format enricher", async () => {
    expect(
      (document1.contentFormatter as DefaultContentFormatter)
        .excludedEmbedMetadataKeys,
    ).not.toContain("NewEmbedKey");
    expect(
      (document1.contentFormatter as DefaultContentFormatter)
        .excludedInferenceMetadataKeys,
    ).not.toContain("NewInferenceKey");

    expect(
      (document2.contentFormatter as DefaultContentFormatter)
        .excludedEmbedMetadataKeys,
    ).not.toContain("NewEmbedKey");
    expect(
      (document2.contentFormatter as DefaultContentFormatter)
        .excludedInferenceMetadataKeys,
    ).not.toContain("NewInferenceKey");

    const enrichedDocuments = await contentFormatTransformer.apply([
      document1,
      document2,
    ]);

    expect(enrichedDocuments.length).toBe(2);
    const doc1 = enrichedDocuments[0]!;
    const doc2 = enrichedDocuments[1]!;

    expect(doc1).toBe(document1);
    expect(doc2).toBe(document2);

    expect(
      (doc1.contentFormatter as DefaultContentFormatter).textTemplate,
    ).toBe(defaultContentFormatter.textTemplate);
    expect(
      (doc1.contentFormatter as DefaultContentFormatter)
        .excludedEmbedMetadataKeys,
    ).toContain("NewEmbedKey");
    expect(
      (doc1.contentFormatter as DefaultContentFormatter)
        .excludedInferenceMetadataKeys,
    ).toContain("NewInferenceKey");

    expect(
      (doc2.contentFormatter as DefaultContentFormatter).textTemplate,
    ).toBe(defaultContentFormatter.textTemplate);
    expect(
      (doc2.contentFormatter as DefaultContentFormatter)
        .excludedEmbedMetadataKeys,
    ).toContain("NewEmbedKey");
    expect(
      (doc2.contentFormatter as DefaultContentFormatter)
        .excludedInferenceMetadataKeys,
    ).toContain("NewInferenceKey");
  });
});
