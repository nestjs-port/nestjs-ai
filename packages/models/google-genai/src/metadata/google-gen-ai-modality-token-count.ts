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

import type { MediaModality, ModalityTokenCount } from "@google/genai";

/**
 * Represents token count information for a specific modality (text, image, audio, video).
 */
export class GoogleGenAiModalityTokenCount {
  readonly modality: string;

  readonly tokenCount: number;

  constructor(modality: string, tokenCount: number) {
    this.modality = modality;
    this.tokenCount = tokenCount;
  }

  /**
   * Creates a GoogleGenAiModalityTokenCount from the SDK's ModalityTokenCount.
   * @param modalityTokenCount the SDK modality token count
   * @return a new GoogleGenAiModalityTokenCount instance
   */
  static from(
    modalityTokenCount: ModalityTokenCount | null,
  ): GoogleGenAiModalityTokenCount | null {
    if (!modalityTokenCount) {
      return null;
    }

    const modality = convertModality(modalityTokenCount.modality);
    const tokens = modalityTokenCount.tokenCount ?? 0;

    return new GoogleGenAiModalityTokenCount(modality, tokens);
  }
}

function convertModality(modality: MediaModality | undefined): string {
  if (!modality) {
    return "UNKNOWN";
  }

  const modalityStr = modality.toUpperCase();

  switch (modalityStr) {
    case "TEXT":
    case "IMAGE":
    case "VIDEO":
    case "AUDIO":
    case "DOCUMENT":
      return modalityStr;
    case "MODALITY_UNSPECIFIED":
    case "MEDIA_MODALITY_UNSPECIFIED":
      return "UNKNOWN";
    default:
      return "UNKNOWN";
  }
}
