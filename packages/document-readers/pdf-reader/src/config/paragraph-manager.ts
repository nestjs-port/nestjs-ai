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
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api.js";

type OutlineNode = Awaited<ReturnType<PDFDocumentProxy["getOutline"]>>[0];

export interface Paragraph {
  parent: Paragraph | null;
  title: string;
  level: number;
  startPageNumber: number;
  endPageNumber: number;
  position: number;
  children: Paragraph[];
}

export class ParagraphManager {
  private readonly _rootParagraph: Paragraph;
  private readonly _document: PDFDocumentProxy;

  private constructor(document: PDFDocumentProxy, rootParagraph: Paragraph) {
    this._document = document;
    this._rootParagraph = rootParagraph;
  }

  static async create(document: PDFDocumentProxy): Promise<ParagraphManager> {
    assert(document != null, "PDDocument must not be null");

    const outline = await document.getOutline();
    assert(
      outline != null,
      "Document outline (e.g. TOC) is null. Make sure the PDF document has a table of contents (TOC). If not, consider the PagePdfDocumentReader or the TikaDocumentReader instead.",
    );

    const rootParagraph: Paragraph = {
      parent: null,
      title: "root",
      level: -1,
      startPageNumber: 1,
      endPageNumber: document.numPages,
      position: 0,
      children: [],
    };

    const manager = new ParagraphManager(document, rootParagraph);
    await manager._generateParagraphs(rootParagraph, outline, 0);
    return manager;
  }

  flatten(): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    for (const child of this._rootParagraph.children) {
      this._flatten(child, paragraphs);
    }
    return paragraphs;
  }

  getParagraphsByLevel(
    paragraph: Paragraph,
    level: number,
    interLevelText: boolean,
  ): Paragraph[] {
    const resultList: Paragraph[] = [];

    if (paragraph.level < level) {
      if (paragraph.children.length > 0) {
        if (interLevelText) {
          const interLevelParagraph: Paragraph = {
            parent: paragraph.parent,
            title: paragraph.title,
            level: paragraph.level,
            startPageNumber: paragraph.startPageNumber,
            endPageNumber: paragraph.children[0].startPageNumber,
            position: paragraph.position,
            children: [],
          };
          resultList.push(interLevelParagraph);
        }

        for (const child of paragraph.children) {
          resultList.push(
            ...this.getParagraphsByLevel(child, level, interLevelText),
          );
        }
      }
    } else if (paragraph.level === level) {
      resultList.push(paragraph);
    }

    return resultList;
  }

  private _flatten(current: Paragraph, paragraphs: Paragraph[]): void {
    paragraphs.push(current);
    for (const child of current.children) {
      this._flatten(child, paragraphs);
    }
  }

  private async _generateParagraphs(
    parentParagraph: Paragraph,
    bookmarkItems: OutlineNode[],
    level: number,
  ): Promise<Paragraph> {
    for (let i = 0; i < bookmarkItems.length; i++) {
      const current = bookmarkItems[i];
      const nextSibling =
        i + 1 < bookmarkItems.length ? bookmarkItems[i + 1] : null;

      const pageNumber = await this._getPageNumber(current?.dest ?? null);
      let nextSiblingNumber = await this._getPageNumber(
        nextSibling?.dest ?? null,
      );

      if (nextSiblingNumber < 0 && current.items.length > 0) {
        const lastChild = current.items[current.items.length - 1];
        nextSiblingNumber = await this._getPageNumber(lastChild?.dest ?? null);
      }

      const paragraphPosition = this._extractParagraphPosition(
        current?.dest ?? null,
      );

      const currentParagraph: Paragraph = {
        parent: parentParagraph,
        title: current.title,
        level,
        startPageNumber: pageNumber,
        endPageNumber: nextSiblingNumber,
        position: paragraphPosition,
        children: [],
      };

      parentParagraph.children.push(currentParagraph);
      await this._generateParagraphs(
        currentParagraph,
        current.items,
        level + 1,
      );
    }

    return parentParagraph;
  }

  private async _getPageNumber(
    dest: string | unknown[] | null,
  ): Promise<number> {
    if (dest == null) {
      return -1;
    }

    const resolvedDest = await this._resolveDestination(dest);
    if (resolvedDest == null || resolvedDest.length === 0) {
      return -1;
    }

    const pageRef = resolvedDest[0] as unknown;

    if (
      typeof pageRef === "object" &&
      pageRef != null &&
      "num" in (pageRef as Record<string, unknown>) &&
      "gen" in (pageRef as Record<string, unknown>)
    ) {
      const ref = pageRef as { num: number; gen: number };
      const pageIndex = await this._document.getPageIndex(ref);
      return pageIndex + 1;
    }

    if (typeof pageRef === "number") {
      return pageRef + 1;
    }

    return -1;
  }

  private _extractParagraphPosition(dest: string | unknown[] | null): number {
    if (!Array.isArray(dest)) {
      return 0;
    }

    const top = dest[3];
    return typeof top === "number" ? Math.trunc(top) : 0;
  }

  private async _resolveDestination(
    dest: string | unknown[],
  ): Promise<unknown[] | null> {
    if (Array.isArray(dest)) {
      return dest;
    }

    if (typeof dest === "string") {
      return this._document.getDestination(dest);
    }

    return null;
  }
}
