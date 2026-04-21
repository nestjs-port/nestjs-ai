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
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { StringUtils } from "@nestjs-port/core";
import { type Document, type DocumentWriter, MetadataMode } from "../document";

export interface FileDocumentWriterProps {
  fileName: string;
  withDocumentMarkers?: boolean;
  metadataMode?: MetadataMode;
  append?: boolean;
}

export class FileDocumentWriter implements DocumentWriter {
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
    assert(StringUtils.hasText(fileName), "File name must have a text.");
    assert(metadataMode != null, "MetadataMode must not be null.");

    this._fileName = fileName;
    this._withDocumentMarkers = withDocumentMarkers;
    this._metadataMode = metadataMode;
    this._append = append;
  }

  async write(docs: Document[]): Promise<void> {
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
