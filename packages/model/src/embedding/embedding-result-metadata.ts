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
import type { MimeType } from "@nestjs-ai/commons";
import type { ResultMetadata } from "../model";

/**
 * Metadata associated with the embedding result.
 */
export class EmbeddingResultMetadata implements ResultMetadata {
  static readonly EMPTY = new EmbeddingResultMetadata();

  private readonly _modalityType: ModalityType;
  private readonly _documentId: string;
  private readonly _mimeType: MimeType;
  private readonly _documentData: unknown;

  constructor(
    documentId: string = "",
    modalityType: ModalityType = "TEXT" as ModalityType,
    mimeType: MimeType = "text/plain",
    documentData: unknown = null,
  ) {
    assert(modalityType != null, "ModalityType must not be null");
    assert(mimeType != null, "MimeType must not be null");

    this._documentId = documentId;
    this._modalityType = modalityType;
    this._mimeType = mimeType;
    this._documentData = documentData;
  }

  get modalityType(): ModalityType {
    return this._modalityType;
  }

  get mimeType(): MimeType {
    return this._mimeType;
  }

  get documentId(): string {
    return this._documentId;
  }

  get documentData(): unknown {
    return this._documentData;
  }
}

export enum ModalityType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
}

export abstract class ModalityUtils {
  /**
   * Infers the {@link ModalityType} of the source data used to generate the
   * embedding using the source data MIME type.
   */
  static getModalityType(mimeType: MimeType | null): ModalityType {
    if (mimeType == null) {
      return ModalityType.TEXT;
    }

    const normalized = mimeType.toLowerCase();

    if (normalized.startsWith("image/")) {
      return ModalityType.IMAGE;
    }
    if (normalized.startsWith("audio/")) {
      return ModalityType.AUDIO;
    }
    if (normalized.startsWith("video/")) {
      return ModalityType.VIDEO;
    }
    if (normalized.startsWith("text/")) {
      return ModalityType.TEXT;
    }

    throw new Error(`Unsupported MimeType: ${mimeType}`);
  }
}
