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

import { describe, expect, it, vi } from "vitest";

import {
  ExtractedTextFormatter,
  PagePdfDocumentReader,
  ParagraphPdfDocumentReader,
  PdfDocumentReaderConfig,
} from "../index.js";

describe("ParagraphPdfDocumentReader", () => {
  const sample1Pdf = new URL("sample1.pdf", import.meta.url);
  const sample3Pdf = new URL("sample3.pdf", import.meta.url);

  it("test pdf without toc", async () => {
    const reader = new ParagraphPdfDocumentReader({
      pdfResource: sample1Pdf,
      config: PdfDocumentReaderConfig.builder()
        .withPageTopMargin(0)
        .withPageBottomMargin(0)
        .withPageExtractedTextFormatter(
          ExtractedTextFormatter.builder()
            .withNumberOfTopTextLinesToDelete(0)
            .withNumberOfBottomTextLinesToDelete(3)
            .withNumberOfTopPagesToSkipBeforeDelete(0)
            .build(),
        )
        .withPagesPerDocument(1)
        .build(),
    });

    await expect(reader.get()).rejects.toThrow(
      "Document outline (e.g. TOC) is null. Make sure the PDF document has a table of contents (TOC). If not, consider the PagePdfDocumentReader or the TikaDocumentReader instead.",
    );
  });

  it("should skip invalid outline", async () => {
    const originalGetPdfDocument =
      PagePdfDocumentReader.prototype.getPdfDocument;
    const getPdfDocumentSpy = vi
      .spyOn(PagePdfDocumentReader.prototype, "getPdfDocument")
      .mockImplementation(async function patchedGetPdfDocument(this: unknown) {
        const document = await originalGetPdfDocument.call(this);
        const originalGetOutline = document.getOutline.bind(document);

        Object.defineProperty(document, "getOutline", {
          value: async () => {
            const outline = await originalGetOutline();
            if (outline != null && outline.length > 1) {
              outline[1] = {
                ...outline[1],
                dest: null,
              };
            }
            return outline;
          },
          configurable: true,
          writable: true,
        });

        return document;
      });

    try {
      const reader = new ParagraphPdfDocumentReader({
        pdfResource: sample3Pdf,
        config: PdfDocumentReaderConfig.defaultConfig(),
      });

      const documents = await reader.get();

      expect(documents).toBeDefined();
      expect(documents).toHaveLength(2);
      expect(documents[0]?.metadata.title).toBe("Chapter 1");
      expect(documents[1]?.metadata.title).toBe("Chapter 3");
    } finally {
      getPdfDocumentSpy.mockRestore();
    }
  });
});
