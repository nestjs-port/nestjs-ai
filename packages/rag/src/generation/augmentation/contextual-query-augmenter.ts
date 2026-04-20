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
import os from "node:os";
import type { Document } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import { Query } from "../../query";
import { PromptAssert } from "../../util";
import { QueryAugmenter } from "./query-augmenter";

export interface ContextualQueryAugmenterProps {
  promptTemplate?: PromptTemplate | null;
  emptyContextPromptTemplate?: PromptTemplate | null;
  allowEmptyContext?: boolean | null;
  documentFormatter?: ((documents: Document[]) => string) | null;
}

/**
 * Augments the user query with contextual data from the content of the provided
 * documents.
 *
 * @example
 * ```typescript
 * const augmenter = new ContextualQueryAugmenter({
 *   allowEmptyContext: false,
 * });
 * const augmentedQuery = augmenter.augment(query, documents);
 * ```
 */
export class ContextualQueryAugmenter extends QueryAugmenter {
  private readonly logger: Logger = LoggerFactory.getLogger(
    ContextualQueryAugmenter.name,
  );

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
    `Context information is below.

---------------------
{context}
---------------------

Given the context information and no prior knowledge, answer the query.

Follow these rules:

1. If the answer is not in the context, just say that you don't know.
2. Avoid statements like "Based on the context..." or "The provided information...".

Query: {query}

Answer:`,
  );

  private static readonly DEFAULT_EMPTY_CONTEXT_PROMPT_TEMPLATE =
    new PromptTemplate(
      `The user query is outside your knowledge base.
Politely inform the user that you can't answer it.`,
    );

  private static readonly DEFAULT_ALLOW_EMPTY_CONTEXT = false;

  private static readonly DEFAULT_DOCUMENT_FORMATTER = (
    documents: Document[],
  ): string =>
    documents
      .map((doc) => doc.text)
      .filter((text): text is string => text != null)
      .join(os.EOL);

  readonly promptTemplate: PromptTemplate;

  readonly emptyContextPromptTemplate: PromptTemplate;

  readonly allowEmptyContext: boolean;

  readonly documentFormatter: (documents: Document[]) => string;

  constructor(props: ContextualQueryAugmenterProps = {}) {
    super();
    this.promptTemplate =
      props.promptTemplate ?? ContextualQueryAugmenter.DEFAULT_PROMPT_TEMPLATE;
    this.emptyContextPromptTemplate =
      props.emptyContextPromptTemplate ??
      ContextualQueryAugmenter.DEFAULT_EMPTY_CONTEXT_PROMPT_TEMPLATE;
    this.allowEmptyContext =
      props.allowEmptyContext ??
      ContextualQueryAugmenter.DEFAULT_ALLOW_EMPTY_CONTEXT;
    this.documentFormatter =
      props.documentFormatter ??
      ContextualQueryAugmenter.DEFAULT_DOCUMENT_FORMATTER;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "query",
      "context",
    );
  }

  override augment(query: Query, documents: Document[]): Query {
    assert(query, "query cannot be null");
    assert(documents, "documents cannot be null");

    this.logger.debug("Augmenting query with contextual data");

    if (documents.length === 0) {
      return this.augmentQueryWhenEmptyContext(query);
    }

    // 1. Collect content from documents.
    const documentContext = this.documentFormatter(documents);

    // 2. Define prompt parameters.
    const promptParameters: Record<string, unknown> = {
      query: query.text,
      context: documentContext,
    };

    // 3. Augment user prompt with document context.
    return new Query(this.promptTemplate.render(promptParameters));
  }

  private augmentQueryWhenEmptyContext(query: Query): Query {
    if (this.allowEmptyContext) {
      this.logger.debug(
        "Empty context is allowed. Returning the original query.",
      );
      return query;
    }
    this.logger.debug(
      "Empty context is not allowed. Returning a specific query for empty context.",
    );
    return new Query(this.emptyContextPromptTemplate.render());
  }
}
