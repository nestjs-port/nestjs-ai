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

export class MarkdownDocumentReaderConfig {
  readonly horizontalRuleCreateDocument: boolean;
  readonly includeCodeBlock: boolean;
  readonly includeBlockquote: boolean;
  readonly additionalMetadata: Record<string, unknown>;

  constructor(builder: MarkdownDocumentReaderConfigBuilder) {
    this.horizontalRuleCreateDocument =
      builder.horizontalRuleCreateDocumentValue;
    this.includeCodeBlock = builder.includeCodeBlockValue;
    this.includeBlockquote = builder.includeBlockquoteValue;
    this.additionalMetadata = builder.additionalMetadataValue;
  }

  static builder(): MarkdownDocumentReaderConfigBuilder {
    return new MarkdownDocumentReaderConfigBuilder();
  }

  static defaultConfig(): MarkdownDocumentReaderConfig {
    return MarkdownDocumentReaderConfig.builder().build();
  }
}

export class MarkdownDocumentReaderConfigBuilder {
  private _horizontalRuleCreateDocument = false;
  private _includeCodeBlock = false;
  private _includeBlockquote = false;
  private _additionalMetadata: Record<string, unknown> = {};

  get horizontalRuleCreateDocumentValue(): boolean {
    return this._horizontalRuleCreateDocument;
  }

  get includeCodeBlockValue(): boolean {
    return this._includeCodeBlock;
  }

  get includeBlockquoteValue(): boolean {
    return this._includeBlockquote;
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

  horizontalRuleCreateDocument(horizontalRuleCreateDocument: boolean): this {
    this._horizontalRuleCreateDocument = horizontalRuleCreateDocument;
    return this;
  }

  includeCodeBlock(includeCodeBlock: boolean): this {
    this._includeCodeBlock = includeCodeBlock;
    return this;
  }

  includeBlockquote(includeBlockquote: boolean): this {
    this._includeBlockquote = includeBlockquote;
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

  build(): MarkdownDocumentReaderConfig {
    return new MarkdownDocumentReaderConfig(this);
  }
}
