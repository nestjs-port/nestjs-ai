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
    modalityType: ModalityType = ModalityType.TEXT,
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
