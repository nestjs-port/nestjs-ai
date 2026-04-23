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

import { DefaultContentFormatter } from "../document/index.js";
import type { ContentFormatter } from "../document/index.js";
import type { Document } from "../document/index.js";
import type { DocumentTransformer } from "../document/index.js";

/**
 * ContentFormatTransformer processes a list of documents by applying a content formatter
 * to each document.
 */
export class ContentFormatTransformer implements DocumentTransformer {
  /**
   * Disable the content-formatter template rewrite.
   */
  private readonly disableTemplateRewrite: boolean;

  private readonly contentFormatter: ContentFormatter;

  /**
   * Creates a ContentFormatTransformer object with the given ContentFormatter.
   *
   * @param contentFormatter the ContentFormatter to be used for transforming the documents
   */
  constructor(contentFormatter: ContentFormatter);

  /**
   * The ContentFormatTransformer class is responsible for processing a list of
   * documents by applying a content formatter to each document.
   *
   * @param contentFormatter The ContentFormatter to be used for transforming the documents
   * @param disableTemplateRewrite Flag indicating whether to disable the content-formatter template rewrite
   */
  constructor(
    contentFormatter: ContentFormatter,
    disableTemplateRewrite?: boolean,
  ) {
    assert(contentFormatter != null, "ContentFormatter is required");
    this.contentFormatter = contentFormatter;
    this.disableTemplateRewrite = disableTemplateRewrite ?? false;
  }

  /**
   * Post process documents chunked from loader. Allows extractors to be chained.
   *
   * @param documents to post process.
   * @return processed documents
   */
  async apply(documents: Document[]): Promise<Document[]> {
    documents.forEach((document) => this.processDocument(document));
    return documents;
  }

  transform(documents: Document[]): Promise<Document[]> {
    return this.apply(documents);
  }

  private processDocument(document: Document): void {
    if (
      document.contentFormatter instanceof DefaultContentFormatter &&
      this.contentFormatter instanceof DefaultContentFormatter
    ) {
      this.updateFormatter(
        document,
        document.contentFormatter,
        this.contentFormatter,
      );
    } else {
      this.overrideFormatter(document);
    }
  }

  private updateFormatter(
    document: Document,
    docFormatter: DefaultContentFormatter,
    toUpdateFormatter: DefaultContentFormatter,
  ): void {
    const updatedEmbedExcludeKeys = [
      ...docFormatter.excludedEmbedMetadataKeys,
      ...toUpdateFormatter.excludedEmbedMetadataKeys,
    ];

    const updatedInterfaceExcludeKeys = [
      ...docFormatter.excludedInferenceMetadataKeys,
      ...toUpdateFormatter.excludedInferenceMetadataKeys,
    ];

    const builder = DefaultContentFormatter.builder()
      .withExcludedEmbedMetadataKeys(updatedEmbedExcludeKeys)
      .withExcludedInferenceMetadataKeys(updatedInterfaceExcludeKeys)
      .withMetadataTemplate(docFormatter.metadataTemplate)
      .withMetadataSeparator(docFormatter.metadataSeparator);

    if (!this.disableTemplateRewrite) {
      builder.withTextTemplate(docFormatter.textTemplate);
    }

    document.setContentFormatter(builder.build());
  }

  private overrideFormatter(document: Document): void {
    document.setContentFormatter(this.contentFormatter);
  }
}
