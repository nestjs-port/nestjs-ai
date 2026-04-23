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

import { LoggerFactory } from "@nestjs-port/core";
import type { Document, DocumentTransformer } from "@nestjs-ai/commons";
import type { ChatModel } from "../../chat/index.js";
import { PromptTemplate } from "../../chat/index.js";

export interface KeywordMetadataEnricherProps {
  /** The model predictor to use for keyword extraction. */
  chatModel: ChatModel;

  /** The number of keywords to extract. */
  keywordCount?: number;

  /** The prompt template to use for keyword extraction. */
  keywordsTemplate?: PromptTemplate | null;
}

/**
 * Keyword extractor that uses generative to extract 'excerpt_keywords' metadata field.
 */
export class KeywordMetadataEnricher implements DocumentTransformer {
  private static readonly logger = LoggerFactory.getLogger(
    KeywordMetadataEnricher.name,
  );

  static readonly CONTEXT_STR_PLACEHOLDER = "context_str";

  static readonly KEYWORDS_TEMPLATE = `{context_str}. Give %s unique keywords for this
document. Format as comma separated. Keywords: `;

  static readonly EXCERPT_KEYWORDS_METADATA_KEY = "excerpt_keywords";

  /** Model predictor. */
  private readonly chatModel: ChatModel;

  /** The prompt template to use for keyword extraction. */
  private readonly keywordsTemplate: PromptTemplate;

  /** Creates a new `KeywordMetadataEnricher` instance. */
  constructor(props: KeywordMetadataEnricherProps) {
    assert(props.chatModel != null, "chatModel must not be null");

    this.chatModel = props.chatModel;
    if ("keywordsTemplate" in props && props.keywordsTemplate == null) {
      assert(false, "keywordsTemplate must not be null");
    }

    if (props.keywordsTemplate != null) {
      if ((props.keywordCount ?? 0) !== 0) {
        KeywordMetadataEnricher.logger.warn(
          "keywordCount will be ignored as keywordsTemplate is set.",
        );
      }
      this.keywordsTemplate = props.keywordsTemplate;
    } else {
      const keywordCount = props.keywordCount ?? 0;
      assert(keywordCount >= 1, "keywordCount must be >= 1");
      this.keywordsTemplate = new PromptTemplate(
        KeywordMetadataEnricher.KEYWORDS_TEMPLATE.replace(
          "%s",
          String(keywordCount),
        ),
      );
    }
  }

  async apply(documents: Document[]): Promise<Document[]> {
    for (const document of documents) {
      const text = document.text;
      const vars: Record<string, unknown> = {};
      if (text != null) {
        vars[KeywordMetadataEnricher.CONTEXT_STR_PLACEHOLDER] = text;
      }

      const prompt = this.keywordsTemplate.create(vars);
      const response = await this.chatModel.call(prompt);
      const generation = response.result;
      if (generation != null) {
        const keywords = generation.output.text;
        if (keywords != null) {
          document.metadata[
            KeywordMetadataEnricher.EXCERPT_KEYWORDS_METADATA_KEY
          ] = keywords;
        }
      }
    }
    return documents;
  }

  transform(documents: Document[]): Promise<Document[]> {
    return this.apply(documents);
  }

  /** Exposed for testing purposes. */
  getKeywordsTemplate(): PromptTemplate {
    return this.keywordsTemplate;
  }
}
