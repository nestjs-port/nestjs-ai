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

import { Buffer } from "node:buffer";

import { get_encoding, type Tiktoken, type TiktokenEncoding } from "tiktoken";

import type { MediaContent } from "../content/index.js";
import type { TokenCountEstimator } from "./token-count-estimator.interface.js";

export class TiktokenTokenCountEstimator implements TokenCountEstimator {
  private readonly _estimator: Tiktoken;

  constructor(tokenEncoding: TiktokenEncoding = "cl100k_base") {
    this._estimator = get_encoding(tokenEncoding);
  }

  estimate(text: string | null): number;
  estimate(content: MediaContent): number;
  estimate(messages: Iterable<MediaContent>): number;
  estimate(
    input: string | null | MediaContent | Iterable<MediaContent>,
  ): number {
    if (typeof input === "string" || input == null) {
      if (input == null) {
        return 0;
      }
      return this._estimator.encode(input).length;
    }

    if (TiktokenTokenCountEstimator.isMediaContent(input)) {
      return this.estimateMediaContent(input);
    }

    let totalSize = 0;
    for (const mediaContent of input) {
      totalSize += this.estimateMediaContent(mediaContent);
    }
    return totalSize;
  }

  private estimateMediaContent(content: MediaContent): number {
    let tokenCount = this.estimate(content.text);

    for (const media of content.media) {
      tokenCount += this.estimate(media.mimeType.toString());

      if (typeof media.data === "string") {
        tokenCount += this.estimate(media.data);
      } else if (
        Buffer.isBuffer(media.data) ||
        media.data instanceof Uint8Array
      ) {
        tokenCount += this.estimate(Buffer.from(media.data).toString("base64"));
      } else if (media.data instanceof ArrayBuffer) {
        tokenCount += this.estimate(Buffer.from(media.data).toString("base64"));
      }
    }

    return tokenCount;
  }

  private static isMediaContent(
    input: MediaContent | Iterable<MediaContent>,
  ): input is MediaContent {
    const candidate = input as Partial<MediaContent>;
    return (
      typeof candidate === "object" && candidate != null && "media" in candidate
    );
  }
}
