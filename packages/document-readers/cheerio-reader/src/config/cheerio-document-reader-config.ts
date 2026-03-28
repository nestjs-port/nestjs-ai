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

export class CheerioDocumentReaderConfig {
  readonly charset: string;
  readonly selector: string;
  readonly separator: string;
  readonly allElements: boolean;
  readonly groupByElement: boolean;
  readonly includeLinkUrls: boolean;
  readonly metadataTags: string[];
  readonly additionalMetadata: Record<string, unknown>;

  constructor(builder: CheerioDocumentReaderConfigBuilder) {
    this.charset = builder.charsetValue;
    this.selector = builder.selectorValue;
    this.separator = builder.separatorValue;
    this.allElements = builder.allElementsValue;
    this.groupByElement = builder.groupByElementValue;
    this.includeLinkUrls = builder.includeLinkUrlsValue;
    this.metadataTags = builder.metadataTagsValue;
    this.additionalMetadata = builder.additionalMetadataValue;
  }

  static builder(): CheerioDocumentReaderConfigBuilder {
    return new CheerioDocumentReaderConfigBuilder();
  }

  static defaultConfig(): CheerioDocumentReaderConfig {
    return CheerioDocumentReaderConfig.builder().build();
  }
}

export class CheerioDocumentReaderConfigBuilder {
  private _charset = "UTF-8";
  private _selector = "body";
  private _separator = "\n";
  private _allElements = false;
  private _groupByElement = false;
  private _includeLinkUrls = false;
  private _metadataTags = ["description", "keywords"];
  private _additionalMetadata: Record<string, unknown> = {};

  get charsetValue(): string {
    return this._charset;
  }

  get selectorValue(): string {
    return this._selector;
  }

  get separatorValue(): string {
    return this._separator;
  }

  get allElementsValue(): boolean {
    return this._allElements;
  }

  get groupByElementValue(): boolean {
    return this._groupByElement;
  }

  get includeLinkUrlsValue(): boolean {
    return this._includeLinkUrls;
  }

  get metadataTagsValue(): string[] {
    return this._metadataTags;
  }

  get additionalMetadataValue(): Record<string, unknown> {
    return this._additionalMetadata;
  }

  private _validateNonNull<T>(
    value: T,
    message: string,
  ): asserts value is NonNullable<T> {
    assert.notEqual(value, null, message);
    assert.notEqual(value, undefined, message);
  }

  charset(charset: string): this {
    this._charset = charset;
    return this;
  }

  selector(selector: string): this {
    this._selector = selector;
    return this;
  }

  separator(separator: string): this {
    this._separator = separator;
    return this;
  }

  allElements(allElements: boolean): this {
    this._allElements = allElements;
    return this;
  }

  groupByElement(groupByElement: boolean): this {
    this._groupByElement = groupByElement;
    return this;
  }

  includeLinkUrls(includeLinkUrls: boolean): this {
    this._includeLinkUrls = includeLinkUrls;
    return this;
  }

  metadataTag(metadataTag: string): this {
    this._metadataTags.push(metadataTag);
    return this;
  }

  metadataTags(metadataTags: string[]): this {
    this._metadataTags = [...metadataTags];
    return this;
  }

  additionalMetadata(key: string, value: unknown): this;
  additionalMetadata(additionalMetadata: Record<string, unknown>): this;
  additionalMetadata(
    keyOrMetadata: string | Record<string, unknown>,
    value?: unknown,
  ): this {
    if (typeof keyOrMetadata === "string") {
      this._validateNonNull(keyOrMetadata, "key must not be null");
      this._validateNonNull(value, "value must not be null");
      this._additionalMetadata[keyOrMetadata] = value;
      return this;
    }

    this._validateNonNull(keyOrMetadata, "additionalMetadata must not be null");
    this._additionalMetadata = keyOrMetadata;
    return this;
  }

  build(): CheerioDocumentReaderConfig {
    return new CheerioDocumentReaderConfig(this);
  }
}
