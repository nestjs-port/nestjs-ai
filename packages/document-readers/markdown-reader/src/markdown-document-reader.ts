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
import {
  Document,
  type DocumentBuilder,
  type DocumentReader,
} from "@nestjs-ai/commons";
import type { Node as CommonmarkNode } from "commonmark";
import * as commonmark from "commonmark";
import fg from "fast-glob";

import { MarkdownDocumentReaderConfig } from "./config/index.js";

type MarkdownResource = string | URL | Buffer;

export interface MarkdownDocumentReaderProps {
  markdownResources: MarkdownResource | MarkdownResource[];
  config?: MarkdownDocumentReaderConfig;
}

export class MarkdownDocumentReader implements DocumentReader {
  private readonly _markdownResources: MarkdownResource[];
  private readonly _config: MarkdownDocumentReaderConfig;
  private readonly _parser: commonmark.Parser;

  constructor({
    markdownResources,
    config = MarkdownDocumentReaderConfig.defaultConfig(),
  }: MarkdownDocumentReaderProps) {
    assert(markdownResources != null, "markdownResources must not be null");
    assert(config != null, "config must not be null");

    this._markdownResources = Array.isArray(markdownResources)
      ? markdownResources
      : [markdownResources];
    this._config = config;
    this._parser = new commonmark.Parser();
  }

  static withDefaults(
    markdownResources: MarkdownResource | MarkdownResource[],
  ): MarkdownDocumentReader {
    return new MarkdownDocumentReader({ markdownResources });
  }

  async get(): Promise<Document[]> {
    const documents: Document[] = [];
    const resources = await this._resolveResources(this._markdownResources);

    for (const resource of resources) {
      const markdown = await this._readResource(resource);
      const document = this._parser.parse(markdown);
      const visitor = new MarkdownDocumentVisitor(this._config);
      visitor.visit(document);
      documents.push(...visitor.getDocuments());
    }

    return documents;
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  private async _resolveResources(
    resources: MarkdownResource[],
  ): Promise<MarkdownResource[]> {
    const resolved: MarkdownResource[] = [];

    for (const resource of resources) {
      if (typeof resource !== "string") {
        resolved.push(resource);
        continue;
      }

      if (!fg.isDynamicPattern(resource)) {
        resolved.push(resource);
        continue;
      }

      const expanded = await fg(resource, {
        onlyFiles: true,
        absolute: true,
        dot: true,
        unique: true,
      });
      resolved.push(...expanded);
    }

    return resolved;
  }

  private async _readResource(resource: MarkdownResource): Promise<string> {
    if (Buffer.isBuffer(resource)) {
      return this._decode(resource);
    }

    if (resource instanceof URL) {
      if (resource.protocol === "file:") {
        const buffer = await readFile(resource);
        return this._decode(buffer);
      }

      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch Markdown resource: ${resource.href}`);
      }

      return response.text();
    }

    if (resource.startsWith("http://") || resource.startsWith("https://")) {
      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch Markdown resource: ${resource}`);
      }

      return response.text();
    }

    const filePath = resolve(resource);
    const buffer = await readFile(filePath);
    return this._decode(buffer);
  }

  private _decode(buffer: Buffer): string {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

class MarkdownDocumentVisitor {
  private readonly _documents: Document[] = [];
  private readonly _currentParagraphs: string[] = [];
  private readonly _config: MarkdownDocumentReaderConfig;
  private _currentDocumentBuilder: DocumentBuilder = Document.builder();

  constructor(config: MarkdownDocumentReaderConfig) {
    this._config = config;
  }

  visit(document: CommonmarkNode): void {
    this._currentDocumentBuilder = Document.builder();
    const walker = document.walker();
    let event = walker.next();

    while (event != null) {
      const node = event.node;
      const entering = event.entering;
      if (entering) {
        this._visitEntering(node);
      }
      event = walker.next();
    }
  }

  getDocuments(): Document[] {
    this._buildAndFlush();
    return this._documents;
  }

  private _visitEntering(node: CommonmarkNode): void {
    switch (node.type) {
      case "heading":
        this._buildAndFlush();
        return;
      case "thematic_break":
        if (this._config.horizontalRuleCreateDocument) {
          this._buildAndFlush();
        }
        return;
      case "softbreak":
      case "linebreak":
      case "item":
        this._translateLineBreakToSpace();
        return;
      case "block_quote":
        if (!this._config.includeBlockquote) {
          this._buildAndFlush();
        }
        this._translateLineBreakToSpace();
        this._currentDocumentBuilder.metadata("category", "blockquote");
        return;
      case "code":
        this._currentParagraphs.push(node.literal ?? "");
        this._currentDocumentBuilder.metadata("category", "code_inline");
        return;
      case "code_block":
        if (!this._isFencedCodeBlock(node)) {
          return;
        }

        if (!this._config.includeCodeBlock) {
          this._buildAndFlush();
        }
        this._translateLineBreakToSpace();
        this._currentParagraphs.push(node.literal ?? "");
        this._currentDocumentBuilder.metadata("category", "code_block");
        this._currentDocumentBuilder.metadata("lang", node.info ?? "");
        this._buildAndFlush();
        return;
      case "text":
        if (node.parent?.type === "heading") {
          this._currentDocumentBuilder.metadata(
            "category",
            `header_${node.parent.level ?? 0}`,
          );
          this._currentDocumentBuilder.metadata("title", node.literal ?? "");
        } else {
          this._currentParagraphs.push(node.literal ?? "");
        }
        return;
      default:
        return;
    }
  }

  private _buildAndFlush(): void {
    if (this._currentParagraphs.length > 0) {
      const content = this._currentParagraphs.join("");
      const builder = this._currentDocumentBuilder.text(content);

      for (const [key, value] of Object.entries(
        this._config.additionalMetadata,
      )) {
        builder.metadata(key, value);
      }

      this._documents.push(builder.build());
      this._currentParagraphs.length = 0;
    }

    this._currentDocumentBuilder = Document.builder();
  }

  private _translateLineBreakToSpace(): void {
    if (this._currentParagraphs.length > 0) {
      this._currentParagraphs.push(" ");
    }
  }

  private _isFencedCodeBlock(node: CommonmarkNode): boolean {
    return Boolean((node as unknown as { _isFenced?: boolean })._isFenced);
  }
}
