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
import { Document, type DocumentReader, StringUtils } from "@nestjs-ai/commons";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";

import { PdfDocumentReaderConfig } from "./config";
import { PdfLayoutTextStripperByArea } from "./layout";

export type PdfResource = string | URL | Buffer;

export interface PagePdfDocumentReaderProps {
  pdfResource: PdfResource;
  config?: PdfDocumentReaderConfig;
}

export class PagePdfDocumentReader implements DocumentReader {
  static readonly METADATA_START_PAGE_NUMBER = "page_number";
  static readonly METADATA_END_PAGE_NUMBER = "end_page_number";
  static readonly METADATA_FILE_NAME = "file_name";

  private static readonly PDF_PAGE_REGION = "pdfPageRegion";

  protected readonly _resourceFileName: string | null;
  private readonly _pdfResource: PdfResource;
  private readonly _config: PdfDocumentReaderConfig;
  private _documentPromise: Promise<PDFDocumentProxy> | null = null;

  constructor({
    pdfResource,
    config = PdfDocumentReaderConfig.defaultConfig(),
  }: PagePdfDocumentReaderProps) {
    assert(pdfResource != null, "pdfResource must not be null");
    assert(config != null, "config must not be null");

    this._pdfResource = pdfResource;
    this._config = config;
    this._resourceFileName = this._extractResourceFileName(pdfResource);
  }

  static withDefaults(pdfResource: PdfResource): PagePdfDocumentReader {
    return new PagePdfDocumentReader({ pdfResource });
  }

  async get(): Promise<Document[]> {
    const document = await this._getDocument();
    const readDocuments: Document[] = [];
    const pdfTextStripper = new PdfLayoutTextStripperByArea();

    let pageNumber = 1;
    let startPageNumber = 1;
    const pageTextGroupList: string[] = [];

    const totalPages = document.numPages;
    const pagesPerDocument = this._getPagesPerDocument(totalPages);

    while (pageNumber <= totalPages) {
      const page = await document.getPage(pageNumber);
      await this._handleSinglePage(
        page,
        pageNumber,
        pdfTextStripper,
        pageTextGroupList,
      );

      if (pageNumber % pagesPerDocument === 0 || pageNumber === totalPages) {
        if (pageTextGroupList.length > 0) {
          readDocuments.push(
            this.toDocument(
              pageTextGroupList.join(""),
              startPageNumber,
              pageNumber,
            ),
          );
          pageTextGroupList.length = 0;
        }
        startPageNumber = pageNumber + 1;
      }

      pageNumber++;
    }

    return readDocuments;
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  get resourceFileName(): string | null {
    return this._resourceFileName;
  }

  async getPdfDocument(): Promise<PDFDocumentProxy> {
    return this._getDocument();
  }

  protected toDocument(
    docText: string,
    startPageNumber: number,
    endPageNumber: number,
  ): Document {
    const doc = new Document(docText);
    doc.metadata[PagePdfDocumentReader.METADATA_START_PAGE_NUMBER] =
      startPageNumber;

    if (startPageNumber !== endPageNumber) {
      doc.metadata[PagePdfDocumentReader.METADATA_END_PAGE_NUMBER] =
        endPageNumber;
    }

    if (this._resourceFileName != null) {
      doc.metadata[PagePdfDocumentReader.METADATA_FILE_NAME] =
        this._resourceFileName;
    }

    return doc;
  }

  private async _handleSinglePage(
    page: PDFPageProxy,
    pageNumber: number,
    pdfTextStripper: PdfLayoutTextStripperByArea,
    pageTextGroupList: string[],
  ): Promise<void> {
    const viewport = page.getViewport({ scale: 1 });

    const x0 = 0;
    const xW = Math.trunc(viewport.width);

    const y0 = this._config.pageTopMargin;
    const yW =
      Math.trunc(viewport.height) -
      (this._config.pageTopMargin + this._config.pageBottomMargin);

    pdfTextStripper.addRegion(PagePdfDocumentReader.PDF_PAGE_REGION, {
      x: x0,
      y: y0,
      width: xW,
      height: Math.max(yW, 0),
    });

    await pdfTextStripper.extractRegions(page);
    let pageText = pdfTextStripper.getTextForRegion(
      PagePdfDocumentReader.PDF_PAGE_REGION,
    );

    if (StringUtils.hasText(pageText)) {
      pageText = this._config.pageExtractedTextFormatter.format(
        pageText,
        pageNumber,
      );
      pageTextGroupList.push(pageText);
    }

    pdfTextStripper.removeRegion(PagePdfDocumentReader.PDF_PAGE_REGION);
  }

  private _getPagesPerDocument(totalPages: number): number {
    if (this._config.pagesPerDocument === PdfDocumentReaderConfig.ALL_PAGES) {
      return totalPages;
    }

    return this._config.pagesPerDocument;
  }

  private async _getDocument(): Promise<PDFDocumentProxy> {
    if (this._documentPromise != null) {
      return this._documentPromise;
    }

    this._documentPromise = this._loadPdfDocument(this._pdfResource);
    return this._documentPromise;
  }

  private async _loadPdfDocument(
    resource: PdfResource,
  ): Promise<PDFDocumentProxy> {
    const buffer = await this._readResource(resource);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      useSystemFonts: true,
    });

    return task.promise;
  }

  private async _readResource(resource: PdfResource): Promise<Buffer> {
    if (Buffer.isBuffer(resource)) {
      return resource;
    }

    if (resource instanceof URL) {
      if (resource.protocol === "file:") {
        return readFile(resource);
      }

      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch PDF resource: ${resource.href}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (resource.startsWith("http://") || resource.startsWith("https://")) {
      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch PDF resource: ${resource}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return readFile(resolve(resource));
  }

  private _extractResourceFileName(resource: PdfResource): string | null {
    if (Buffer.isBuffer(resource)) {
      return null;
    }

    const value = resource instanceof URL ? resource.pathname : resource;
    const parts = value.split("/").filter((part) => part.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }
}
