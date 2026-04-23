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
import { ExtractedTextFormatter } from "../extracted-text-formatter.js";

export class PdfDocumentReaderConfig {
  static readonly ALL_PAGES = 0;

  readonly reversedParagraphPosition: boolean;
  readonly pagesPerDocument: number;
  readonly pageTopMargin: number;
  readonly pageBottomMargin: number;
  readonly pageExtractedTextFormatter: ExtractedTextFormatter;

  constructor(builder: PdfDocumentReaderConfigBuilder) {
    this.pagesPerDocument = builder.pagesPerDocumentValue;
    this.pageBottomMargin = builder.pageBottomMarginValue;
    this.pageTopMargin = builder.pageTopMarginValue;
    this.pageExtractedTextFormatter = builder.pageExtractedTextFormatterValue;
    this.reversedParagraphPosition = builder.reversedParagraphPositionValue;
  }

  static builder(): PdfDocumentReaderConfigBuilder {
    return new PdfDocumentReaderConfigBuilder();
  }

  static defaultConfig(): PdfDocumentReaderConfig {
    return PdfDocumentReaderConfig.builder().build();
  }
}

export class PdfDocumentReaderConfigBuilder {
  private _pagesPerDocument = 1;
  private _pageTopMargin = 0;
  private _pageBottomMargin = 0;
  private _pageExtractedTextFormatter = ExtractedTextFormatter.defaults();
  private _reversedParagraphPosition = false;

  get pagesPerDocumentValue(): number {
    return this._pagesPerDocument;
  }

  get pageTopMarginValue(): number {
    return this._pageTopMargin;
  }

  get pageBottomMarginValue(): number {
    return this._pageBottomMargin;
  }

  get pageExtractedTextFormatterValue(): ExtractedTextFormatter {
    return this._pageExtractedTextFormatter;
  }

  get reversedParagraphPositionValue(): boolean {
    return this._reversedParagraphPosition;
  }

  withPageExtractedTextFormatter(
    pageExtractedTextFormatter: ExtractedTextFormatter,
  ): this {
    assert(
      pageExtractedTextFormatter != null,
      "PageExtractedTextFormatter must not be null.",
    );
    this._pageExtractedTextFormatter = pageExtractedTextFormatter;
    return this;
  }

  withPagesPerDocument(pagesPerDocument: number): this {
    assert(pagesPerDocument >= 0, "Page count must be a positive value.");
    this._pagesPerDocument = pagesPerDocument;
    return this;
  }

  withPageTopMargin(topMargin: number): this {
    assert(topMargin >= 0, "Page margins must be a positive value.");
    this._pageTopMargin = topMargin;
    return this;
  }

  withPageBottomMargin(bottomMargin: number): this {
    assert(bottomMargin >= 0, "Page margins must be a positive value.");
    this._pageBottomMargin = bottomMargin;
    return this;
  }

  withReversedParagraphPosition(reversedParagraphPosition: boolean): this {
    this._reversedParagraphPosition = reversedParagraphPosition;
    return this;
  }

  build(): PdfDocumentReaderConfig {
    return new PdfDocumentReaderConfig(this);
  }
}
