import { EOL } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ExtractedTextFormatter,
  PagePdfDocumentReader,
  PdfDocumentReaderConfig,
} from "..";

describe("PagePdfDocumentReader", () => {
  const sample1Pdf = resolve(__dirname, "sample1.pdf");
  const sample2Pdf = resolve(__dirname, "sample2.pdf");

  it("file url read", async () => {
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
  });

  it("test index out of bound", async () => {
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
  });

  it("test pages per document", async () => {
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
  });

  it("test pages per document not divisible", async () => {
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
  });

  it("test all pages per document", async () => {
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
  });
});
