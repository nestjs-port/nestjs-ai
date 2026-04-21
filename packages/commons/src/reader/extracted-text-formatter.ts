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

import { EOL } from "node:os";
import { StringUtils } from "@nestjs-port/core";

export class ExtractedTextFormatter {
  private readonly _leftAlignment: boolean;
  private readonly _numberOfTopPagesToSkipBeforeDelete: number;
  private readonly _numberOfTopTextLinesToDelete: number;
  private readonly _numberOfBottomTextLinesToDelete: number;
  private readonly _lineSeparator: string;

  constructor(builder: ExtractedTextFormatterBuilder) {
    this._leftAlignment = builder.leftAlignment;
    this._numberOfBottomTextLinesToDelete =
      builder.numberOfBottomTextLinesToDelete;
    this._numberOfTopPagesToSkipBeforeDelete =
      builder.numberOfTopPagesToSkipBeforeDelete;
    this._numberOfTopTextLinesToDelete = builder.numberOfTopTextLinesToDelete;
    this._lineSeparator = builder.lineSeparator;
  }

  static builder(): ExtractedTextFormatterBuilder {
    return new ExtractedTextFormatterBuilder();
  }

  static defaults(): ExtractedTextFormatter {
    return new ExtractedTextFormatterBuilder().build();
  }

  static trimAdjacentBlankLines(pageText: string): string {
    return pageText
      .replace(/(^ *\n)/gm, "\n")
      .replace(/^$([\r\n]+?)(^$[\r\n]+?^)+/gm, "$1");
  }

  static alignToLeft(pageText: string): string {
    return pageText
      .replace(/(^ *| +(?= |$))/gm, "")
      .replace(/^$(\t?)(^$[\r\n]+?^)+/gm, "$1");
  }

  static deleteBottomTextLines(
    pageText: string,
    numberOfLines: number,
    lineSeparator: string,
  ): string {
    if (!StringUtils.hasText(pageText)) {
      return pageText;
    }

    let lineCount = 0;
    let truncateIndex = pageText.length;
    let nextTruncateIndex = truncateIndex;
    while (lineCount < numberOfLines && nextTruncateIndex >= 0) {
      nextTruncateIndex = pageText.lastIndexOf(
        lineSeparator,
        truncateIndex - 1,
      );
      truncateIndex = nextTruncateIndex < 0 ? truncateIndex : nextTruncateIndex;
      lineCount++;
    }
    return pageText.substring(0, truncateIndex);
  }

  static deleteTopTextLines(
    pageText: string,
    numberOfLines: number,
    lineSeparator: string,
  ): string {
    if (!StringUtils.hasText(pageText)) {
      return pageText;
    }

    let lineCount = 0;
    let truncateIndex = 0;
    let nextTruncateIndex = truncateIndex;
    while (lineCount < numberOfLines && nextTruncateIndex >= 0) {
      nextTruncateIndex = pageText.indexOf(lineSeparator, truncateIndex + 1);
      truncateIndex = nextTruncateIndex < 0 ? truncateIndex : nextTruncateIndex;
      lineCount++;
    }
    return pageText.substring(truncateIndex);
  }

  format(pageText: string): string;
  format(pageText: string, pageNumber: number): string;
  format(pageText: string, pageNumber = 0): string {
    let text = ExtractedTextFormatter.trimAdjacentBlankLines(pageText);

    if (pageNumber >= this._numberOfTopPagesToSkipBeforeDelete) {
      text = ExtractedTextFormatter.deleteTopTextLines(
        text,
        this._numberOfTopTextLinesToDelete,
        this._lineSeparator,
      );
      text = ExtractedTextFormatter.deleteBottomTextLines(
        text,
        this._numberOfBottomTextLinesToDelete,
        this._lineSeparator,
      );
    }

    if (this._leftAlignment) {
      text = ExtractedTextFormatter.alignToLeft(text);
    }

    return text;
  }
}

export class ExtractedTextFormatterBuilder {
  leftAlignment = false;
  numberOfTopPagesToSkipBeforeDelete = 0;
  numberOfTopTextLinesToDelete = 0;
  numberOfBottomTextLinesToDelete = 0;
  lineSeparator = EOL;

  withLeftAlignment(leftAlignment: boolean): this {
    this.leftAlignment = leftAlignment;
    return this;
  }

  withNumberOfTopPagesToSkipBeforeDelete(
    numberOfTopPagesToSkipBeforeDelete: number,
  ): this {
    this.numberOfTopPagesToSkipBeforeDelete =
      numberOfTopPagesToSkipBeforeDelete;
    return this;
  }

  withNumberOfTopTextLinesToDelete(numberOfTopTextLinesToDelete: number): this {
    this.numberOfTopTextLinesToDelete = numberOfTopTextLinesToDelete;
    return this;
  }

  withNumberOfBottomTextLinesToDelete(
    numberOfBottomTextLinesToDelete: number,
  ): this {
    this.numberOfBottomTextLinesToDelete = numberOfBottomTextLinesToDelete;
    return this;
  }

  overrideLineSeparator(lineSeparator: string): this {
    this.lineSeparator = lineSeparator;
    return this;
  }

  build(): ExtractedTextFormatter {
    return new ExtractedTextFormatter(this);
  }
}
