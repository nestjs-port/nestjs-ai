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
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Document, type DocumentReader } from "@nestjs-ai/commons";
import { load } from "cheerio";

import { CheerioDocumentReaderConfig } from "./config/index.js";

export interface CheerioDocumentReaderProps {
  htmlResource: string | URL | Buffer;
  config?: CheerioDocumentReaderConfig;
  baseUrl?: string | URL;
}

export class CheerioDocumentReader implements DocumentReader {
  private readonly _htmlResource: string | URL | Buffer;
  private readonly _config: CheerioDocumentReaderConfig;
  private readonly _baseUrl: string | null;

  constructor({
    htmlResource,
    config = CheerioDocumentReaderConfig.defaultConfig(),
    baseUrl,
  }: CheerioDocumentReaderProps) {
    assert(htmlResource != null, "htmlResource must not be null");
    assert(config != null, "config must not be null");

    this._htmlResource = htmlResource;
    this._config = config;
    this._baseUrl = baseUrl == null ? null : String(baseUrl);
  }

  static withDefaults(
    htmlResource: string | URL | Buffer,
    baseUrl?: string | URL,
  ): CheerioDocumentReader {
    return new CheerioDocumentReader({ htmlResource, baseUrl });
  }

  async get(): Promise<Document[]> {
    try {
      const html = await this._readResource();
      const $ = load(html);
      const effectiveBaseUrl = this._resolveBaseUrl($);
      const documents: Document[] = [];

      if (this._config.allElements) {
        // Extract text from all elements and create a single document
        // .body to exclude head
        const allText = this._normalizedText($("body").text());
        const document = new Document(allText);
        this._addMetadata($, document, effectiveBaseUrl);
        documents.push(document);
        return documents;
      }

      if (this._config.groupByElement) {
        // Extract text on a per-element base using the defined selector.
        $(this._config.selector).each((_, element) => {
          const elementText = this._normalizedText($(element).text());
          const document = new Document(elementText);
          // Do not add metadata from element to avoid duplication.
          this._addMetadata($, document, effectiveBaseUrl);
          documents.push(document);
        });
        return documents;
      }

      // Extract text from specific elements based on the selector
      const text = $(this._config.selector)
        .toArray()
        .map((element) => this._normalizedText($(element).text()))
        .join(this._config.separator);
      const document = new Document(text);
      this._addMetadata($, document, effectiveBaseUrl);
      documents.push(document);
      return documents;
    } catch (error) {
      throw new Error(
        `Failed to read HTML resource: ${String(this._htmlResource)}`,
        {
          cause: error,
        },
      );
    }
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  private _addMetadata(
    $: ReturnType<typeof load>,
    document: Document,
    baseUrl: string | null,
  ): void {
    const metadata: Record<string, unknown> = {};
    metadata.title = $("title").first().text();

    for (const metaTag of this._config.metadataTags) {
      const value = $(`meta[name="${metaTag}"]`).first().attr("content") ?? "";
      if (value.length > 0) {
        metadata[metaTag] = value;
      }
    }

    if (this._config.includeLinkUrls) {
      metadata.linkUrls = $("a[href]")
        .toArray()
        .map((element) => {
          const href = $(element).attr("href") ?? "";
          return this._resolveLinkUrl(href, baseUrl);
        });
    }

    // Use putAll to add all entries from additionalMetadata
    Object.assign(metadata, this._config.additionalMetadata);
    // Add all collected metadata to the Spring Document
    Object.assign(document.metadata, metadata);
  }

  private _resolveBaseUrl($: ReturnType<typeof load>): string | null {
    if (this._baseUrl != null && this._baseUrl.length > 0) {
      return this._baseUrl;
    }

    const baseTagHref = $("base[href]").first().attr("href") ?? "";
    if (baseTagHref.length > 0) {
      return baseTagHref;
    }

    return null;
  }

  private _resolveLinkUrl(href: string, baseUrl: string | null): string {
    if (href.length === 0 || baseUrl == null || baseUrl.length === 0) {
      return href;
    }

    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  private async _readResource(): Promise<string> {
    if (Buffer.isBuffer(this._htmlResource)) {
      return this._decode(this._htmlResource);
    }

    if (this._htmlResource instanceof URL) {
      if (this._htmlResource.protocol === "file:") {
        const buffer = await readFile(this._htmlResource);
        return this._decode(buffer);
      }

      const response = await fetch(this._htmlResource);
      if (!response.ok) {
        throw new Error(
          `Unable to fetch HTML resource: ${this._htmlResource.href}`,
        );
      }
      return response.text();
    }

    const resource = this._htmlResource;
    if (resource.startsWith("http://") || resource.startsWith("https://")) {
      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch HTML resource: ${resource}`);
      }
      return response.text();
    }

    try {
      const filePath = resolve(resource);
      const buffer = await readFile(filePath);
      return this._decode(buffer);
    } catch (error) {
      throw new Error(`Unable to read HTML file resource: ${resource}`, {
        cause: error,
      });
    }
  }

  private _decode(buffer: Buffer): string {
    return new TextDecoder(this._normalizeCharset(this._config.charset)).decode(
      buffer,
    );
  }

  private _normalizeCharset(charset: string): string {
    return charset.toLowerCase();
  }

  private _normalizedText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }
}
