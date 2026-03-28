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
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import type { Query } from "../../../query";
import { PromptAssert } from "../../../util";
import { QueryTransformer } from "./query-transformer";

export interface TranslationQueryTransformerProps {
  chatClientBuilder: ChatClient.Builder;
  promptTemplate?: PromptTemplate | null;
  targetLanguage: string;
}

/**
 * Uses a large language model to translate a query to a target language that is supported
 * by the embedding model used to generate the document embeddings. If the query is
 * already in the target language, it is returned unchanged. If the language of the query
 * is unknown, it is also returned unchanged.
 *
 * This transformer is useful when the embedding model is trained on a specific language
 * and the user query is in a different language.
 *
 * @example
 * ```typescript
 * const transformer = new TranslationQueryTransformer({
 *   chatClientBuilder,
 *   targetLanguage: "english",
 * });
 * const transformedQuery = await transformer.transform(new Query("Hvad er Danmarks hovedstad?"));
 * ```
 */
export class TranslationQueryTransformer extends QueryTransformer {
  private readonly logger: Logger = LoggerFactory.getLogger(
    TranslationQueryTransformer.name,
  );

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
    `Given a user query, translate it to {targetLanguage}.
If the query is already in {targetLanguage}, return it unchanged.
If you don't know the language of the query, return it unchanged.
Do not add explanations nor any other text.

Original query: {query}

Translated query:`,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly targetLanguage: string;

  constructor(props: TranslationQueryTransformerProps) {
    super();
    assert(props.chatClientBuilder, "chatClientBuilder cannot be null");
    assert(
      StringUtils.hasText(props.targetLanguage),
      "targetLanguage cannot be null or empty",
    );

    this.chatClient = props.chatClientBuilder.build();
    this.promptTemplate =
      props.promptTemplate ??
      TranslationQueryTransformer.DEFAULT_PROMPT_TEMPLATE;
    this.targetLanguage = props.targetLanguage;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "targetLanguage",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    this.logger.debug(
      "Translating query to target language: {}",
      this.targetLanguage,
    );

    const translatedQueryText = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("targetLanguage", this.targetLanguage)
          .param("query", query.text),
      )
      .call()
      .content();

    if (!StringUtils.hasText(translatedQueryText)) {
      this.logger.warn(
        "Query translation result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(translatedQueryText).build();
  }
}
