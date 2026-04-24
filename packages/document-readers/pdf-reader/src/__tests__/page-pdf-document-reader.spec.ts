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

import { describe, expect, it } from "vitest";

import {
  ExtractedTextFormatter,
  PagePdfDocumentReader,
  PdfDocumentReaderConfig,
} from "../index.js";

describe("PagePdfDocumentReader", () => {
  const TEST_TIMEOUT = 30_000;
  const sample1Pdf = new URL("sample1.pdf", import.meta.url);
  const sample2Pdf = new URL("sample2.pdf", import.meta.url);

  it(
    "file url read",
    async () => {
      const pdfReader = new PagePdfDocumentReader({
        pdfResource: sample1Pdf,
        config: PdfDocumentReaderConfig.builder()
          .withPageTopMargin(0)
          .withPageBottomMargin(0)
          .withPageExtractedTextFormatter(
            ExtractedTextFormatter.builder()
              .withNumberOfTopTextLinesToDelete(0)
              .withNumberOfBottomTextLinesToDelete(3)
              .withNumberOfTopPagesToSkipBeforeDelete(0)
              .overrideLineSeparator("\n")
              .build(),
          )
          .withPagesPerDocument(1)
          .build(),
      });

      const docs = await pdfReader.get();

      expect(docs).toHaveLength(4);

      const allText = docs.map((document) => document.text ?? "").join(EOL);

      expect(allText).not.toContain("Page  1 of 4");
      expect(allText).not.toContain("Page  2 of 4");
      expect(allText).not.toContain("Page  3 of 4");
      expect(allText).not.toContain("Page  4 of 4");
      expect(allText).not.toContain("PDF  Bookmark   Sample");
    },
    TEST_TIMEOUT,
  );

  it(
    "test index out of bound",
    async () => {
      const documents = await new PagePdfDocumentReader({
        pdfResource: sample2Pdf,
        config: PdfDocumentReaderConfig.builder()
          .withPageExtractedTextFormatter(
            ExtractedTextFormatter.builder().build(),
          )
          .withPagesPerDocument(1)
          .build(),
      }).get();

      expect(documents).toHaveLength(64);
    },
    TEST_TIMEOUT,
  );

  it(
    "test pages per document",
    async () => {
      // The test pdf contain 64 pages
      const documents = await new PagePdfDocumentReader({
        pdfResource: sample2Pdf,
        config: PdfDocumentReaderConfig.builder()
          .withPageExtractedTextFormatter(
            ExtractedTextFormatter.builder().build(),
          )
          .withPagesPerDocument(32)
          .build(),
      }).get();

      expect(documents).toHaveLength(2);
    },
    TEST_TIMEOUT,
  );

  it(
    "test pages per document not divisible",
    async () => {
      // The test pdf contain 64 pages
      const documents = await new PagePdfDocumentReader({
        pdfResource: sample2Pdf,
        config: PdfDocumentReaderConfig.builder()
          .withPageExtractedTextFormatter(
            ExtractedTextFormatter.builder().build(),
          )
          .withPagesPerDocument(3)
          .build(),
      }).get();

      expect(documents).toHaveLength(22);
    },
    TEST_TIMEOUT,
  );

  it(
    "test all pages per document",
    async () => {
      // The test pdf contain 64 pages
      const documents = await new PagePdfDocumentReader({
        pdfResource: sample2Pdf,
        config: PdfDocumentReaderConfig.builder()
          .withPageExtractedTextFormatter(
            ExtractedTextFormatter.builder().build(),
          )
          .withPagesPerDocument(0) // all pages into one document
          .build(),
      }).get();

      expect(documents).toHaveLength(1);
    },
    TEST_TIMEOUT,
  );
});
