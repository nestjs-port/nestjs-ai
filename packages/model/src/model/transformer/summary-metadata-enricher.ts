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

import assert from "node:assert/strict";
import {
  type Document,
  type DocumentTransformer,
  MetadataMode,
} from "@nestjs-ai/commons";
import type { ChatModel } from "../../chat/index.js";
import { PromptTemplate } from "../../chat/index.js";

/**
 * Title extractor with adjacent sharing that uses generative to extract
 * 'section_summary', 'prev_section_summary', 'next_section_summary' metadata fields.
 */
export class SummaryMetadataEnricher implements DocumentTransformer {
  /** Template for summary extraction. */
  static readonly DEFAULT_SUMMARY_EXTRACT_TEMPLATE = `Here is the content of the section:
{context_str}

Summarize the key topics and entities of the section.

Summary:`;

  private static readonly SECTION_SUMMARY_METADATA_KEY = "section_summary";

  private static readonly NEXT_SECTION_SUMMARY_METADATA_KEY =
    "next_section_summary";

  private static readonly PREV_SECTION_SUMMARY_METADATA_KEY =
    "prev_section_summary";

  private static readonly CONTEXT_STR_PLACEHOLDER = "context_str";

  /** AI client. */
  private readonly _chatModel: ChatModel;

  /** Number of documents from front to use for title extraction. */
  private readonly _summaryTypes: SummaryType[];

  private readonly _metadataMode: MetadataMode;

  /** Template for summary extraction. */
  private readonly _summaryTemplate: string;

  constructor(chatModel: ChatModel, summaryTypes: SummaryType[]);
  constructor(
    chatModel: ChatModel,
    summaryTypes: SummaryType[],
    summaryTemplate: string,
    metadataMode: MetadataMode,
  );
  constructor(
    chatModel: ChatModel,
    summaryTypes: SummaryType[] = [SummaryType.CURRENT],
    summaryTemplate: string = SummaryMetadataEnricher.DEFAULT_SUMMARY_EXTRACT_TEMPLATE,
    metadataMode: MetadataMode = MetadataMode.ALL,
  ) {
    assert(chatModel != null, "ChatModel must not be null");
    assert(
      summaryTemplate != null && summaryTemplate.trim().length > 0,
      "Summary template must not be empty",
    );

    this._chatModel = chatModel;
    this._summaryTypes =
      summaryTypes == null || summaryTypes.length === 0
        ? [SummaryType.CURRENT]
        : summaryTypes;
    this._metadataMode = metadataMode;
    this._summaryTemplate = summaryTemplate;
  }

  async apply(documents: Document[]): Promise<Document[]> {
    const documentSummaries: string[] = [];

    for (const document of documents) {
      const documentContext = document.getFormattedContent(this._metadataMode);
      const prompt = new PromptTemplate(this._summaryTemplate).create({
        [SummaryMetadataEnricher.CONTEXT_STR_PLACEHOLDER]: documentContext,
      });
      const chatResponse = await this._chatModel.call(prompt);
      const generation = chatResponse.result;

      documentSummaries.push(generation?.output.text ?? "");
    }

    for (let i = 0; i < documentSummaries.length; i++) {
      const summaryMetadata = this.getSummaryMetadata(i, documentSummaries);
      Object.assign(documents[i]!.metadata, summaryMetadata);
    }

    return documents;
  }

  transform(documents: Document[]): Promise<Document[]> {
    return this.apply(documents);
  }

  private getSummaryMetadata(
    index: number,
    documentSummaries: string[],
  ): Record<string, unknown> {
    const summaryMetadata: Record<string, unknown> = {};

    if (index > 0 && this._summaryTypes.includes(SummaryType.PREVIOUS)) {
      summaryMetadata[
        SummaryMetadataEnricher.PREV_SECTION_SUMMARY_METADATA_KEY
      ] = documentSummaries[index - 1];
    }
    if (
      index < documentSummaries.length - 1 &&
      this._summaryTypes.includes(SummaryType.NEXT)
    ) {
      summaryMetadata[
        SummaryMetadataEnricher.NEXT_SECTION_SUMMARY_METADATA_KEY
      ] = documentSummaries[index + 1];
    }
    if (this._summaryTypes.includes(SummaryType.CURRENT)) {
      summaryMetadata[SummaryMetadataEnricher.SECTION_SUMMARY_METADATA_KEY] =
        documentSummaries[index];
    }

    return summaryMetadata;
  }
}

export enum SummaryType {
  PREVIOUS = "PREVIOUS",
  CURRENT = "CURRENT",
  NEXT = "NEXT",
}
