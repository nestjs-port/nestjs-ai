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
import { StringUtils } from "@nestjs-port/core";
import type { Content, Media } from "../content/index.js";
import type { ContentFormatter } from "./content-formatter.interface.js";
import { DefaultContentFormatter } from "./default-content-formatter.js";
import type { IdGenerator } from "./id/index.js";
import { RandomIdGenerator } from "./id/index.js";
import { MetadataMode } from "./metadata-mode.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export class Document implements Content {
  static readonly DEFAULT_CONTENT_FORMATTER =
    DefaultContentFormatter.defaultConfig();

  private _id!: string;
  private _text!: string | null;
  private _media!: Media | null;
  private _metadata!: Record<string, unknown>;
  private _score!: number | null;
  private _contentFormatter: ContentFormatter =
    Document.DEFAULT_CONTENT_FORMATTER;

  constructor(content: string | null);
  constructor(text: string | null, metadata: Record<string, unknown>);
  constructor(
    id: string,
    text: string | null,
    metadata: Record<string, unknown>,
  );
  constructor(media: Media | null, metadata: Record<string, unknown>);
  constructor(
    id: string,
    media: Media | null,
    metadata: Record<string, unknown>,
  );
  constructor(
    arg1: string | Media | null,
    arg2?: string | Media | Record<string, unknown> | null,
    arg3?: Record<string, unknown>,
  ) {
    if (arg2 == null && arg3 == null) {
      this.initialize(
        new RandomIdGenerator().generateId(),
        (arg1 as string | null) ?? null,
        null,
        {},
        null,
      );
      return;
    }

    if (isRecord(arg2) && arg3 == null) {
      const metadata = arg2;
      if (typeof arg1 === "string" || arg1 == null) {
        this.initialize(
          new RandomIdGenerator().generateId(),
          arg1,
          null,
          metadata,
          null,
        );
      } else {
        this.initialize(
          new RandomIdGenerator().generateId(),
          null,
          arg1,
          metadata,
          null,
        );
      }
      return;
    }

    const id = arg1;
    const metadata = arg3;
    assert(
      typeof id === "string" && StringUtils.hasText(id),
      "id cannot be null or empty",
    );
    assert(isRecord(metadata), "metadata cannot be null");
    if (typeof arg2 === "string" || arg2 == null) {
      this.initialize(id, arg2 ?? null, null, metadata, null);
    } else {
      this.initialize(id, null, arg2 as Media, metadata, null);
    }
  }

  static builder(): DocumentBuilder {
    return new DocumentBuilder();
  }

  private initialize(
    id: string,
    text: string | null,
    media: Media | null,
    metadata: Record<string, unknown>,
    score: number | null,
  ): void {
    assert(StringUtils.hasText(id), "id cannot be null or empty");
    assert(metadata != null, "metadata cannot be null");
    for (const [key, value] of Object.entries(metadata)) {
      assert(key != null, "metadata cannot have null keys");
      assert(value != null, "metadata cannot have null values");
    }
    assert(
      (text != null && media == null) || (text == null && media != null),
      "exactly one of text or media must be specified",
    );

    this._id = id;
    this._text = text;
    this._media = media;
    this._metadata = { ...metadata };
    this._score = score;
    this._contentFormatter = Document.DEFAULT_CONTENT_FORMATTER;
  }

  get id(): string {
    return this._id;
  }

  get text(): string | null {
    return this._text;
  }

  get isText(): boolean {
    return this._text != null;
  }

  get media(): Media | null {
    return this._media;
  }

  getFormattedContent(): string;
  getFormattedContent(metadataMode: MetadataMode): string;
  getFormattedContent(
    formatter: ContentFormatter,
    metadataMode: MetadataMode,
  ): string;
  getFormattedContent(
    metadataModeOrFormatter?: MetadataMode | ContentFormatter,
    metadataMode?: MetadataMode,
  ): string {
    if (
      metadataModeOrFormatter != null &&
      typeof metadataModeOrFormatter === "object"
    ) {
      assert(metadataMode != null, "Metadata mode must not be null");
      return metadataModeOrFormatter.format(this, metadataMode);
    }

    const effectiveMetadataMode = metadataModeOrFormatter ?? MetadataMode.ALL;
    return this._contentFormatter.format(this, effectiveMetadataMode);
  }

  get metadata(): Record<string, unknown> {
    return this._metadata;
  }

  get score(): number | null {
    return this._score;
  }

  get contentFormatter(): ContentFormatter {
    return this._contentFormatter;
  }

  setContentFormatter(contentFormatter: ContentFormatter): void {
    this._contentFormatter = contentFormatter;
  }

  mutate(): DocumentBuilder {
    return new DocumentBuilder()
      .id(this._id)
      .text(this._text)
      .media(this._media)
      .metadata(this._metadata)
      .score(this._score);
  }

  static createInternal(
    id: string,
    text: string | null,
    media: Media | null,
    metadata: Record<string, unknown>,
    score: number | null,
  ): Document {
    const document = Object.create(Document.prototype) as Document;
    document.initialize(id, text, media, metadata, score);
    return document;
  }
}

export class DocumentBuilder {
  private _id: string | null = null;
  private _text: string | null = null;
  private _media: Media | null = null;
  private _metadata: Record<string, unknown> = {};
  private _score: number | null = null;
  private _idGenerator: IdGenerator = new RandomIdGenerator();

  idGenerator(idGenerator: IdGenerator): this {
    assert(idGenerator != null, "idGenerator cannot be null");
    this._idGenerator = idGenerator;
    return this;
  }

  id(id: string): this {
    assert(StringUtils.hasText(id), "id cannot be null or empty");
    this._id = id;
    return this;
  }

  text(text: string | null): this {
    this._text = text;
    return this;
  }

  media(media: Media | null): this {
    this._media = media;
    return this;
  }

  metadata(metadata: Record<string, unknown>): this;
  metadata(key: string, value: unknown): this;
  metadata(
    metadataOrKey: Record<string, unknown> | string,
    value?: unknown,
  ): this {
    if (typeof metadataOrKey === "string") {
      assert(metadataOrKey != null, "metadata key cannot be null");
      assert(value != null, "metadata value cannot be null");
      this._metadata[metadataOrKey] = value;
      return this;
    }

    assert(metadataOrKey != null, "metadata cannot be null");
    this._metadata = metadataOrKey;
    return this;
  }

  score(score: number | null): this {
    this._score = score;
    return this;
  }

  build(): Document {
    if (!StringUtils.hasText(this._id)) {
      const text = this._text ?? "";
      this._id = this._idGenerator.generateId(text, this._metadata);
    }
    return Document.createInternal(
      this._id,
      this._text,
      this._media,
      this._metadata,
      this._score,
    );
  }
}
