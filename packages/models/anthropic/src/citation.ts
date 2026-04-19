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

/**
 * Represents a citation reference in a Claude response. Citations indicate which
 * parts of the provided documents were referenced when generating the response.
 *
 * Citations are returned in the response metadata under the "citations" key and
 * include:
 * - The cited text from the document
 * - The document index (which document was cited)
 * - The document title (if provided)
 * - Location information (character ranges, page numbers, or content block indices)
 *
 * Citation types:
 * - `CHAR_LOCATION`: For plain text documents, includes character start/end indices
 * - `PAGE_LOCATION`: For PDF documents, includes page start/end numbers
 * - `CONTENT_BLOCK_LOCATION`: For custom content documents, includes block start/end indices
 * - `WEB_SEARCH_RESULT_LOCATION`: For web search results, includes the URL
 *
 * @see AnthropicCitationDocument
 */
export class Citation {
  private readonly _type: Citation.LocationType;
  private readonly _citedText: string;
  private readonly _documentIndex: number;
  private readonly _documentTitle: string | null;

  // Location-specific fields
  private _startCharIndex: number | null = null;
  private _endCharIndex: number | null = null;
  private _startPageNumber: number | null = null;
  private _endPageNumber: number | null = null;
  private _startBlockIndex: number | null = null;
  private _endBlockIndex: number | null = null;
  private _url: string | null = null;

  // Private constructor
  private constructor(
    type: Citation.LocationType,
    citedText: string,
    documentIndex: number,
    documentTitle: string | null,
  ) {
    this._type = type;
    this._citedText = citedText;
    this._documentIndex = documentIndex;
    this._documentTitle = documentTitle;
  }

  /**
   * Create a character location citation for plain text documents.
   *
   * @param citedText the text that was cited from the document
   * @param documentIndex the index of the document (0-based)
   * @param documentTitle the title of the document
   * @param startCharIndex the starting character index (0-based, inclusive)
   * @param endCharIndex the ending character index (exclusive)
   * @returns a new Citation with CHAR_LOCATION type
   */
  static ofCharLocation(
    citedText: string,
    documentIndex: number,
    documentTitle: string | null,
    startCharIndex: number,
    endCharIndex: number,
  ): Citation {
    const citation = new Citation(
      Citation.LocationType.CHAR_LOCATION,
      citedText,
      documentIndex,
      documentTitle,
    );
    citation._startCharIndex = startCharIndex;
    citation._endCharIndex = endCharIndex;
    return citation;
  }

  /**
   * Create a page location citation for PDF documents.
   *
   * @param citedText the text that was cited from the document
   * @param documentIndex the index of the document (0-based)
   * @param documentTitle the title of the document
   * @param startPageNumber the starting page number (1-based, inclusive)
   * @param endPageNumber the ending page number (exclusive)
   * @returns a new Citation with PAGE_LOCATION type
   */
  static ofPageLocation(
    citedText: string,
    documentIndex: number,
    documentTitle: string | null,
    startPageNumber: number,
    endPageNumber: number,
  ): Citation {
    const citation = new Citation(
      Citation.LocationType.PAGE_LOCATION,
      citedText,
      documentIndex,
      documentTitle,
    );
    citation._startPageNumber = startPageNumber;
    citation._endPageNumber = endPageNumber;
    return citation;
  }

  /**
   * Create a content block location citation for custom content documents.
   *
   * @param citedText the text that was cited from the document
   * @param documentIndex the index of the document (0-based)
   * @param documentTitle the title of the document
   * @param startBlockIndex the starting content block index (0-based, inclusive)
   * @param endBlockIndex the ending content block index (exclusive)
   * @returns a new Citation with CONTENT_BLOCK_LOCATION type
   */
  static ofContentBlockLocation(
    citedText: string,
    documentIndex: number,
    documentTitle: string | null,
    startBlockIndex: number,
    endBlockIndex: number,
  ): Citation {
    const citation = new Citation(
      Citation.LocationType.CONTENT_BLOCK_LOCATION,
      citedText,
      documentIndex,
      documentTitle,
    );
    citation._startBlockIndex = startBlockIndex;
    citation._endBlockIndex = endBlockIndex;
    return citation;
  }

  /**
   * Create a web search result location citation. For this type,
   * `getDocumentIndex()` returns 0 and is not meaningful; use `getUrl()` instead.
   *
   * @param citedText the text that was cited from the search result
   * @param url the URL of the search result
   * @param documentTitle the title of the web page
   * @returns a new Citation with WEB_SEARCH_RESULT_LOCATION type
   */
  static ofWebSearchResultLocation(
    citedText: string,
    url: string,
    documentTitle: string | null,
  ): Citation {
    const citation = new Citation(
      Citation.LocationType.WEB_SEARCH_RESULT_LOCATION,
      citedText,
      0,
      documentTitle,
    );
    citation._url = url;
    return citation;
  }

  get type(): Citation.LocationType {
    return this._type;
  }

  get citedText(): string {
    return this._citedText;
  }

  get documentIndex(): number {
    return this._documentIndex;
  }

  get documentTitle(): string | null {
    return this._documentTitle;
  }

  get startCharIndex(): number | null {
    return this._startCharIndex;
  }

  get endCharIndex(): number | null {
    return this._endCharIndex;
  }

  get startPageNumber(): number | null {
    return this._startPageNumber;
  }

  get endPageNumber(): number | null {
    return this._endPageNumber;
  }

  get startBlockIndex(): number | null {
    return this._startBlockIndex;
  }

  get endBlockIndex(): number | null {
    return this._endBlockIndex;
  }

  get url(): string | null {
    return this._url;
  }

  /**
   * Get a human-readable location description.
   */
  getLocationDescription(): string {
    switch (this.type) {
      case Citation.LocationType.CHAR_LOCATION:
        return `Characters ${this.startCharIndex}-${this.endCharIndex}`;
      case Citation.LocationType.PAGE_LOCATION:
        assert(
          this.startPageNumber != null,
          "startPageNumber must be defined with page-based location",
        );
        assert(
          this.endPageNumber != null,
          "endPageNumber must be defined with page-based location",
        );
        return this.startPageNumber === this.endPageNumber - 1
          ? `Page ${this.startPageNumber}`
          : `Pages ${this.startPageNumber}-${this.endPageNumber - 1}`;
      case Citation.LocationType.CONTENT_BLOCK_LOCATION:
        assert(
          this.startBlockIndex != null,
          "startBlockIndex must be defined with block-based location",
        );
        assert(
          this.endBlockIndex != null,
          "endBlockIndex must be defined with block-based location",
        );
        return this.startBlockIndex === this.endBlockIndex - 1
          ? `Block ${this.startBlockIndex}`
          : `Blocks ${this.startBlockIndex}-${this.endBlockIndex - 1}`;
      case Citation.LocationType.WEB_SEARCH_RESULT_LOCATION:
        assert(
          this.url != null,
          "url must be defined with web search result location",
        );
        return this.url;
    }
  }
}

export namespace Citation {
  export enum LocationType {
    /** Character-based location for plain text documents. */
    CHAR_LOCATION = "CHAR_LOCATION",
    /** Page-based location for PDF documents. */
    PAGE_LOCATION = "PAGE_LOCATION",
    /** Block-based location for custom content documents. */
    CONTENT_BLOCK_LOCATION = "CONTENT_BLOCK_LOCATION",
    /** URL-based location for web search results. */
    WEB_SEARCH_RESULT_LOCATION = "WEB_SEARCH_RESULT_LOCATION",
  }
}
