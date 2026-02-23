import assert from "node:assert/strict";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { type Document, DocumentWriter, MetadataMode } from "../document";
import { StringUtils } from "../util";

export interface FileDocumentWriterProps {
  fileName: string;
  withDocumentMarkers?: boolean;
  metadataMode?: MetadataMode;
  append?: boolean;
}

export class FileDocumentWriter extends DocumentWriter {
  static readonly METADATA_START_PAGE_NUMBER = "page_number";
  static readonly METADATA_END_PAGE_NUMBER = "end_page_number";

  private readonly _fileName: string;
  private readonly _withDocumentMarkers: boolean;
  private readonly _metadataMode: MetadataMode;
  private readonly _append: boolean;

  constructor({
    fileName,
    withDocumentMarkers = false,
    metadataMode = MetadataMode.NONE,
    append = false,
  }: FileDocumentWriterProps) {
    super();
    assert(StringUtils.hasText(fileName), "File name must have a text.");
    assert(metadataMode != null, "MetadataMode must not be null.");

    this._fileName = fileName;
    this._withDocumentMarkers = withDocumentMarkers;
    this._metadataMode = metadataMode;
    this._append = append;
  }

  async accept(docs: Document[]): Promise<void> {
    try {
      const source = Readable.from(this.contentChunks(docs));
      const destination = createWriteStream(this._fileName, {
        encoding: "utf8",
        flags: this._append ? "a" : "w",
      });
      await pipeline(source, destination);
    } catch (error) {
      throw new Error("Failed to write documents to file", {
        cause: error,
      });
    }
  }

  private *contentChunks(docs: Document[]): Generator<string> {
    let index = 0;
    for (const doc of docs) {
      if (this._withDocumentMarkers) {
        yield `\n### Doc: ${index}, pages:[${doc.metadata[FileDocumentWriter.METADATA_START_PAGE_NUMBER]},${doc.metadata[FileDocumentWriter.METADATA_END_PAGE_NUMBER]}]\n`;
      }
      yield doc.getFormattedContent(this._metadataMode);
      index++;
    }
  }
}
