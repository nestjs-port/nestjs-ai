import assert from "node:assert/strict";
import { Document, type DocumentReader, StringUtils } from "@nestjs-ai/commons";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";
import {
  type Paragraph,
  ParagraphManager,
  PdfDocumentReaderConfig,
} from "./config";
import { PdfLayoutTextStripperByArea } from "./layout";
import {
  PagePdfDocumentReader,
  type PdfResource,
} from "./page-pdf-document-reader";

export interface ParagraphPdfDocumentReaderProps {
  pdfResource: PdfResource;
  config?: PdfDocumentReaderConfig;
}

export class ParagraphPdfDocumentReader implements DocumentReader {
  private static readonly METADATA_START_PAGE = "page_number";
  private static readonly METADATA_END_PAGE = "end_page_number";
  private static readonly METADATA_TITLE = "title";
  private static readonly METADATA_LEVEL = "level";
  private static readonly METADATA_FILE_NAME = "file_name";

  private readonly _pageReader: PagePdfDocumentReader;
  private readonly _config: PdfDocumentReaderConfig;
  private _documentPromise: Promise<PDFDocumentProxy> | null = null;
  private _paragraphManagerPromise: Promise<ParagraphManager> | null = null;

  constructor({
    pdfResource,
    config = PdfDocumentReaderConfig.defaultConfig(),
  }: ParagraphPdfDocumentReaderProps) {
    assert(pdfResource != null, "pdfResource must not be null");
    assert(config != null, "config must not be null");

    this._config = config;
    this._pageReader = new PagePdfDocumentReader({ pdfResource, config });
  }

  static withDefaults(pdfResource: PdfResource): ParagraphPdfDocumentReader {
    return new ParagraphPdfDocumentReader({ pdfResource });
  }

  async get(): Promise<Document[]> {
    const paragraphTextExtractor = await this._getParagraphManager();
    const paragraphs = paragraphTextExtractor.flatten();
    const documents: Document[] = [];

    if (paragraphs.length === 0) {
      return documents;
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const from = paragraphs[i];
      const to = i + 1 < paragraphs.length ? paragraphs[i + 1] : from;
      const document = await this.toDocument(from, to);

      if (document != null && StringUtils.hasText(document.text)) {
        documents.push(document);
      }
    }

    return documents;
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  protected async toDocument(
    from: Paragraph,
    to: Paragraph,
  ): Promise<Document | null> {
    const docText = await this.getTextBetweenParagraphs(from, to);

    if (!StringUtils.hasText(docText)) {
      return null;
    }

    const document = new Document(docText);
    this.addMetadata(from, to, document);
    return document;
  }

  protected addMetadata(
    from: Paragraph,
    to: Paragraph,
    document: Document,
  ): void {
    document.metadata[ParagraphPdfDocumentReader.METADATA_TITLE] = from.title;
    document.metadata[ParagraphPdfDocumentReader.METADATA_START_PAGE] =
      from.startPageNumber;
    document.metadata[ParagraphPdfDocumentReader.METADATA_END_PAGE] =
      to.endPageNumber;
    document.metadata[ParagraphPdfDocumentReader.METADATA_LEVEL] = from.level;

    if (this._pageReader.resourceFileName != null) {
      document.metadata[ParagraphPdfDocumentReader.METADATA_FILE_NAME] =
        this._pageReader.resourceFileName;
    }
  }

  async getTextBetweenParagraphs(
    fromParagraph: Paragraph,
    toParagraph: Paragraph,
  ): Promise<string> {
    if (fromParagraph.startPageNumber < 1) {
      return "";
    }

    const document = await this._getDocument();

    // Page started from index 0, while PDFBox getPage return them from index 1.
    const startPage = fromParagraph.startPageNumber - 1;
    let endPage = toParagraph.startPageNumber - 1;

    if (fromParagraph === toParagraph || endPage < startPage) {
      endPage = startPage;
    }

    const sb: string[] = [];
    const pdfTextStripper = new PdfLayoutTextStripperByArea();

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
      const page = await document.getPage(pageNumber + 1);
      const viewport = page.getViewport({ scale: 1 });

      const fromPos = fromParagraph.position;
      const toPos = fromParagraph !== toParagraph ? toParagraph.position : 0;

      const x = 0;
      const w = Math.trunc(viewport.width);
      let y: number;
      let h: number;

      if (pageNumber === startPage && pageNumber === endPage) {
        y = toPos;
        h = fromPos - toPos;
      } else if (pageNumber === startPage) {
        y = 0;
        h = fromPos;
      } else if (pageNumber === endPage) {
        y = toPos;
        h = Math.trunc(viewport.height) - toPos;
      } else {
        y = 0;
        h = Math.trunc(viewport.height);
      }

      if (h < 0) {
        h = 0;
      }

      await this._extractRegionText(page, pdfTextStripper, x, y, w, h, sb);
    }

    let text = sb.join("");
    if (StringUtils.hasText(text)) {
      text = this._config.pageExtractedTextFormatter.format(text, startPage);
    }

    return text;
  }

  private async _extractRegionText(
    page: PDFPageProxy,
    pdfTextStripper: PdfLayoutTextStripperByArea,
    x: number,
    y: number,
    w: number,
    h: number,
    buffer: string[],
  ): Promise<void> {
    pdfTextStripper.addRegion("pdfPageRegion", {
      x,
      y,
      width: w,
      height: h,
    });

    await pdfTextStripper.extractRegions(page);
    const text = pdfTextStripper.getTextForRegion("pdfPageRegion");

    if (StringUtils.hasText(text)) {
      buffer.push(text);
    }

    pdfTextStripper.removeRegion("pdfPageRegion");
  }

  private async _getDocument(): Promise<PDFDocumentProxy> {
    if (this._documentPromise != null) {
      return this._documentPromise;
    }

    this._documentPromise = this._pageReader.getPdfDocument();

    return this._documentPromise;
  }

  private async _getParagraphManager(): Promise<ParagraphManager> {
    if (this._paragraphManagerPromise != null) {
      return this._paragraphManagerPromise;
    }

    this._paragraphManagerPromise = (async () => {
      const document = await this._getDocument();
      return ParagraphManager.create(document);
    })();

    return this._paragraphManagerPromise;
  }
}
