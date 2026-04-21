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
import { readFileSync } from "node:fs";

import type {
  Base64PDFSource,
  CitationsConfigParam,
  ContentBlockSource,
  ContentBlockSourceContent,
  DocumentBlockParam,
  PlainTextSource,
  TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import { StringUtils } from "@nestjs-port/core";

interface AnthropicCitationDocumentProps {
  type: DocumentType;
  sourceData: string | Uint8Array | readonly string[];
  title?: string | null;
  context?: string | null;
  citationsEnabled?: boolean;
}

/**
 * Builder class for creating citation-enabled documents using the Anthropic SDK.
 * Produces SDK {@link DocumentBlockParam} objects directly.
 *
 * <p>
 * Citations allow Claude to reference specific parts of provided documents in its
 * responses. When a citation document is included in a prompt, Claude can cite the source
 * material, and citation metadata (character ranges, page numbers, or content blocks) is
 * returned in the response.
 *
 * <h3>Usage Examples</h3>
 *
 * <p>
 * <b>Plain Text Document:</b>
 *
 * <pre>{@code
 * AnthropicCitationDocument document = AnthropicCitationDocument.builder()
 *     .plainText("The Eiffel Tower was completed in 1889 in Paris, France.")
 *     .title("Eiffel Tower Facts")
 *     .citationsEnabled(true)
 *     .build();
 * }</pre>
 *
 * <p>
 * <b>PDF Document:</b>
 *
 * <pre>{@code
 * AnthropicCitationDocument document = AnthropicCitationDocument.builder()
 *     .pdfFile("path/to/document.pdf")
 *     .title("Technical Specification")
 *     .citationsEnabled(true)
 *     .build();
 * }</pre>
 *
 * <p>
 * <b>Custom Content Blocks:</b>
 *
 * <pre>{@code
 * AnthropicCitationDocument document = AnthropicCitationDocument.builder()
 *     .customContent(
 *         "Fact 1: The Great Wall spans 21,196 kilometers.",
 *         "Fact 2: Construction began in the 7th century BC.",
 *         "Fact 3: It was built to protect Chinese states."
 *     )
 *     .title("Great Wall Facts")
 *     .citationsEnabled(true)
 *     .build();
 * }</pre>
 *
 * @see Citation
 * @see AnthropicChatOptions#getCitationDocuments()
 */
export class AnthropicCitationDocument {
  private readonly _type: DocumentType;
  private readonly _title: string | null;
  private readonly _context: string | null;
  private readonly _sourceData: string | Uint8Array | readonly string[];
  private readonly _citationsEnabled: boolean;

  constructor(props: AnthropicCitationDocumentProps) {
    this._type = props.type;
    this._title = props.title ?? null;
    this._context = props.context ?? null;
    this._sourceData = props.sourceData;
    this._citationsEnabled = props.citationsEnabled ?? false;
  }

  static builder(): AnthropicCitationDocument.Builder {
    return new AnthropicCitationDocument.Builder();
  }

  /**
   * Convert this citation document to an SDK {@link DocumentBlockParam}.
   * @returns configured DocumentBlockParam for the Anthropic API
   */
  toDocumentBlockParam(): DocumentBlockParam {
    const citationsConfig: CitationsConfigParam = {
      enabled: this._citationsEnabled,
    };

    let source: Base64PDFSource | PlainTextSource | ContentBlockSource;

    switch (this._type) {
      case DocumentType.PLAIN_TEXT:
        source = {
          type: "text",
          media_type: "text/plain",
          data: this._sourceData as string,
        };
        break;
      case DocumentType.PDF:
        source = {
          type: "base64",
          media_type: "application/pdf",
          data: Buffer.from(this._sourceData as Uint8Array).toString("base64"),
        };
        break;
      case DocumentType.CUSTOM_CONTENT: {
        const textBlocks = this._sourceData as readonly string[];
        const contentItems: ContentBlockSourceContent[] = textBlocks.map(
          (text) =>
            ({
              type: "text",
              text,
            }) as TextBlockParam,
        );

        source = {
          type: "content",
          content: contentItems,
        };
        break;
      }
    }

    const document: DocumentBlockParam = {
      type: "document",
      source,
      citations: citationsConfig,
    };

    if (this._title != null) {
      document.title = this._title;
    }
    if (this._context != null) {
      document.context = this._context;
    }

    return document;
  }

  isCitationsEnabled(): boolean {
    return this._citationsEnabled;
  }
}

/**
 * Document types supported by Anthropic Citations API.
 */
export enum DocumentType {
  /** Plain text document with character-based citations. */
  PLAIN_TEXT = "PLAIN_TEXT",

  /** PDF document with page-based citations. */
  PDF = "PDF",

  /** Custom content with user-defined blocks and block-based citations. */
  CUSTOM_CONTENT = "CUSTOM_CONTENT",
}

export namespace AnthropicCitationDocument {
  /**
   * Builder class for AnthropicCitationDocument.
   */
  export class Builder {
    private _type: DocumentType | undefined;
    private _title: string | null = null;
    private _context: string | null = null;
    private _sourceData: string | Uint8Array | readonly string[] | undefined;
    private _citationsEnabled = false;

    /**
     * Create a plain text document.
     * @param text the document text content
     * @returns builder for method chaining
     */
    plainText(text: string): this {
      assert(StringUtils.hasText(text), "Text content cannot be null or empty");
      this._type = DocumentType.PLAIN_TEXT;
      this._sourceData = text;
      return this;
    }

    /**
     * Create a PDF document from byte array.
     * @param pdfBytes the PDF file content as bytes
     * @returns builder for method chaining
     */
    pdf(pdfBytes: Uint8Array): this {
      assert(pdfBytes != null, "PDF bytes cannot be null");
      assert(pdfBytes.length > 0, "PDF bytes cannot be empty");
      this._type = DocumentType.PDF;
      this._sourceData = pdfBytes;
      return this;
    }

    /**
     * Create a PDF document from file path.
     * @param filePath path to the PDF file
     * @returns builder for method chaining
     * @throws if the file cannot be read
     */
    pdfFile(filePath: string): this {
      assert(
        StringUtils.hasText(filePath),
        "File path cannot be null or empty",
      );
      return this.pdf(readFileSync(filePath));
    }

    /**
     * Create a custom content document from text blocks.
     * @param textBlocks variable number of text strings to create content blocks
     * @returns builder for method chaining
     */
    customContent(...textBlocks: string[]): this {
      assert(textBlocks != null, "Text blocks cannot be null");
      assert(textBlocks.length > 0, "Text blocks cannot be empty");
      this._type = DocumentType.CUSTOM_CONTENT;
      this._sourceData = [...textBlocks];
      return this;
    }

    /**
     * Set the document title.
     * @param title document title for reference
     * @returns builder for method chaining
     */
    title(title: string): this {
      this._title = title;
      return this;
    }

    /**
     * Set the document context.
     * @param context additional context about the document
     * @returns builder for method chaining
     */
    context(context: string): this {
      this._context = context;
      return this;
    }

    /**
     * Enable or disable citations for this document.
     * @param enabled whether citations should be enabled
     * @returns builder for method chaining
     */
    citationsEnabled(enabled: boolean): this {
      this._citationsEnabled = enabled;
      return this;
    }

    /**
     * Build the AnthropicCitationDocument.
     * @returns configured citation document
     */
    build(): AnthropicCitationDocument {
      assert(this._type != null, "Document type must be specified");
      assert(
        this._sourceData != null,
        "Document source data must be specified",
      );
      return new AnthropicCitationDocument({
        type: this._type,
        title: this._title,
        context: this._context,
        sourceData: this._sourceData,
        citationsEnabled: this._citationsEnabled,
      });
    }
  }
}
