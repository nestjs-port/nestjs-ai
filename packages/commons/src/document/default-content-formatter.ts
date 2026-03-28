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
import { EOL } from "node:os";

import { StringUtils } from "../util";
import type { ContentFormatter } from "./content-formatter.interface";
import type { Document } from "./document";
import { MetadataMode } from "./metadata-mode";

const TEMPLATE_CONTENT_PLACEHOLDER = "{content}";
const TEMPLATE_METADATA_STRING_PLACEHOLDER = "{metadata_string}";
const TEMPLATE_VALUE_PLACEHOLDER = "{value}";
const TEMPLATE_KEY_PLACEHOLDER = "{key}";

const DEFAULT_METADATA_TEMPLATE = `${TEMPLATE_KEY_PLACEHOLDER}: ${TEMPLATE_VALUE_PLACEHOLDER}`;
const DEFAULT_METADATA_SEPARATOR = EOL;
const DEFAULT_TEXT_TEMPLATE = `${TEMPLATE_METADATA_STRING_PLACEHOLDER}\n\n${TEMPLATE_CONTENT_PLACEHOLDER}`;

export class DefaultContentFormatter implements ContentFormatter {
  private readonly _metadataTemplate: string;
  private readonly _metadataSeparator: string;
  private readonly _textTemplate: string;
  private readonly _excludedInferenceMetadataKeys: string[];
  private readonly _excludedEmbedMetadataKeys: string[];

  constructor(builder: DefaultContentFormatterBuilder) {
    this._metadataTemplate = builder.metadataTemplate;
    this._metadataSeparator = builder.metadataSeparator;
    this._textTemplate = builder.textTemplate;
    this._excludedInferenceMetadataKeys = [
      ...builder.excludedInferenceMetadataKeys,
    ];
    this._excludedEmbedMetadataKeys = [...builder.excludedEmbedMetadataKeys];
  }

  static builder(): DefaultContentFormatterBuilder {
    return new DefaultContentFormatterBuilder();
  }

  static defaultConfig(): DefaultContentFormatter {
    return DefaultContentFormatter.builder().build();
  }

  format(document: Document, metadataMode: MetadataMode): string {
    const metadata = this.metadataFilter(document.metadata, metadataMode);

    const metadataText = Object.entries(metadata)
      .map(([key, value]) =>
        this._metadataTemplate
          .replace(TEMPLATE_KEY_PLACEHOLDER, key)
          .replace(TEMPLATE_VALUE_PLACEHOLDER, String(value)),
      )
      .join(this._metadataSeparator);

    const text = document.text ?? "";
    return this._textTemplate
      .replace(TEMPLATE_METADATA_STRING_PLACEHOLDER, metadataText)
      .replace(TEMPLATE_CONTENT_PLACEHOLDER, text);
  }

  private metadataFilter(
    metadata: Record<string, unknown>,
    metadataMode: MetadataMode,
  ): Record<string, unknown> {
    if (metadataMode === MetadataMode.ALL) {
      return metadata;
    }
    if (metadataMode === MetadataMode.NONE) {
      return {};
    }

    const usableMetadataKeys = new Set(Object.keys(metadata));

    if (metadataMode === MetadataMode.INFERENCE) {
      for (const key of this._excludedInferenceMetadataKeys) {
        usableMetadataKeys.delete(key);
      }
    } else if (metadataMode === MetadataMode.EMBED) {
      for (const key of this._excludedEmbedMetadataKeys) {
        usableMetadataKeys.delete(key);
      }
    }

    return Object.entries(metadata).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (usableMetadataKeys.has(key)) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  }

  get metadataTemplate(): string {
    return this._metadataTemplate;
  }

  get metadataSeparator(): string {
    return this._metadataSeparator;
  }

  get textTemplate(): string {
    return this._textTemplate;
  }

  get excludedInferenceMetadataKeys(): string[] {
    return [...this._excludedInferenceMetadataKeys];
  }

  get excludedEmbedMetadataKeys(): string[] {
    return [...this._excludedEmbedMetadataKeys];
  }
}

export class DefaultContentFormatterBuilder {
  private _metadataTemplate = DEFAULT_METADATA_TEMPLATE;
  private _metadataSeparator = DEFAULT_METADATA_SEPARATOR;
  private _textTemplate = DEFAULT_TEXT_TEMPLATE;
  private _excludedInferenceMetadataKeys: string[] = [];
  private _excludedEmbedMetadataKeys: string[] = [];

  get metadataTemplate(): string {
    return this._metadataTemplate;
  }

  get metadataSeparator(): string {
    return this._metadataSeparator;
  }

  get textTemplate(): string {
    return this._textTemplate;
  }

  get excludedInferenceMetadataKeys(): string[] {
    return [...this._excludedInferenceMetadataKeys];
  }

  get excludedEmbedMetadataKeys(): string[] {
    return [...this._excludedEmbedMetadataKeys];
  }

  from(fromFormatter: DefaultContentFormatter): this {
    return this.withExcludedEmbedMetadataKeys(
      fromFormatter.excludedEmbedMetadataKeys,
    )
      .withExcludedInferenceMetadataKeys(
        fromFormatter.excludedInferenceMetadataKeys,
      )
      .withMetadataSeparator(fromFormatter.metadataSeparator)
      .withMetadataTemplate(fromFormatter.metadataTemplate)
      .withTextTemplate(fromFormatter.textTemplate);
  }

  withMetadataTemplate(metadataTemplate: string): this {
    assert(
      StringUtils.hasText(metadataTemplate),
      "Metadata Template must not be empty",
    );
    this._metadataTemplate = metadataTemplate;
    return this;
  }

  withMetadataSeparator(metadataSeparator: string): this {
    assert(metadataSeparator != null, "Metadata separator must not be empty");
    this._metadataSeparator = metadataSeparator;
    return this;
  }

  withTextTemplate(textTemplate: string): this {
    assert(
      StringUtils.hasText(textTemplate),
      "Document's text template must not be empty",
    );
    this._textTemplate = textTemplate;
    return this;
  }

  withExcludedInferenceMetadataKeys(
    excludedInferenceMetadataKeys: string[],
  ): this;
  withExcludedInferenceMetadataKeys(...keys: string[]): this;
  withExcludedInferenceMetadataKeys(...args: [string[]] | string[]): this {
    if (args.length === 1 && Array.isArray(args[0])) {
      assert(
        args[0] != null,
        "Excluded inference metadata keys must not be null",
      );
      this._excludedInferenceMetadataKeys = [...args[0]];
      return this;
    }

    assert(args != null, "Excluded inference metadata keys must not be null");
    this._excludedInferenceMetadataKeys.push(...(args as string[]));
    return this;
  }

  withExcludedEmbedMetadataKeys(excludedEmbedMetadataKeys: string[]): this;
  withExcludedEmbedMetadataKeys(...keys: string[]): this;
  withExcludedEmbedMetadataKeys(...args: [string[]] | string[]): this {
    if (args.length === 1 && Array.isArray(args[0])) {
      assert(args[0] != null, "Excluded Embed metadata keys must not be null");
      this._excludedEmbedMetadataKeys = [...args[0]];
      return this;
    }

    assert(args != null, "Excluded Embed metadata keys must not be null");
    this._excludedEmbedMetadataKeys.push(...(args as string[]));
    return this;
  }

  build(): DefaultContentFormatter {
    return new DefaultContentFormatter(this);
  }
}
