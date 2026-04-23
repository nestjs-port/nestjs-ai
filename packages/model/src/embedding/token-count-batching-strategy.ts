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
import {
  type ContentFormatter,
  DefaultContentFormatter,
  Document,
  MetadataMode,
  type TiktokenEncoding,
  TiktokenTokenCountEstimator,
  type TokenCountEstimator,
} from "@nestjs-ai/commons";
import type { BatchingStrategy } from "./batching-strategy.interface.js";

/**
 * Token count based strategy implementation for {@link BatchingStrategy}.
 */
export class TokenCountBatchingStrategy implements BatchingStrategy {
  /**
   * Using openai upper limit of input token count as the default.
   */
  private static readonly MAX_INPUT_TOKEN_COUNT = 8191;

  /**
   * The default percentage of tokens to reserve.
   */
  private static readonly DEFAULT_TOKEN_COUNT_RESERVE_PERCENTAGE = 0.1;

  /**
   * The default token encoding used for token counting.
   */
  private static readonly DEFAULT_TOKEN_ENCODING: TiktokenEncoding =
    "cl100k_base";

  private readonly _tokenCountEstimator: TokenCountEstimator;
  private readonly _maxInputTokenCount: number;
  private readonly _contentFormatter: ContentFormatter;
  private readonly _metadataMode: MetadataMode;

  constructor();
  constructor(
    encodingType: TiktokenEncoding,
    maxInputTokenCount: number,
    reservePercentage: number,
  );
  constructor(
    encodingType: TiktokenEncoding,
    maxInputTokenCount: number,
    reservePercentage: number,
    contentFormatter: ContentFormatter,
    metadataMode: MetadataMode,
  );
  constructor(
    tokenCountEstimator: TokenCountEstimator,
    maxInputTokenCount: number,
    reservePercentage: number,
    contentFormatter: ContentFormatter,
    metadataMode: MetadataMode,
  );
  constructor(
    tokenCountEstimatorOrEncodingType:
      | TokenCountEstimator
      | TiktokenEncoding = TokenCountBatchingStrategy.DEFAULT_TOKEN_ENCODING,
    maxInputTokenCount: number = TokenCountBatchingStrategy.MAX_INPUT_TOKEN_COUNT,
    reservePercentage: number = TokenCountBatchingStrategy.DEFAULT_TOKEN_COUNT_RESERVE_PERCENTAGE,
    contentFormatter: ContentFormatter = Document.DEFAULT_CONTENT_FORMATTER ??
      DefaultContentFormatter.defaultConfig(),
    metadataMode: MetadataMode = MetadataMode.NONE,
  ) {
    let tokenCountEstimator: TokenCountEstimator;
    if (typeof tokenCountEstimatorOrEncodingType === "string") {
      assert(
        tokenCountEstimatorOrEncodingType != null,
        "EncodingType must not be null",
      );
      tokenCountEstimator = new TiktokenTokenCountEstimator(
        tokenCountEstimatorOrEncodingType,
      );
    } else {
      assert(
        tokenCountEstimatorOrEncodingType != null,
        "TokenCountEstimator must not be null",
      );
      tokenCountEstimator = tokenCountEstimatorOrEncodingType;
    }

    assert(maxInputTokenCount > 0, "MaxInputTokenCount must be greater than 0");
    assert(
      reservePercentage >= 0 && reservePercentage < 1,
      "ReservePercentage must be in range [0, 1)",
    );
    assert(contentFormatter != null, "ContentFormatter must not be null");
    assert(metadataMode != null, "MetadataMode must not be null");

    this._tokenCountEstimator = tokenCountEstimator;
    this._maxInputTokenCount = Math.round(
      maxInputTokenCount * (1 - reservePercentage),
    );
    this._contentFormatter = contentFormatter;
    this._metadataMode = metadataMode;
  }

  batch(documents: Document[]): Document[][] {
    const batches: Document[][] = [];
    let currentSize = 0;
    let currentBatch: Document[] = [];

    const documentTokens = new Map<Document, number>();

    for (const document of documents) {
      const tokenCount = this._tokenCountEstimator.estimate(
        document.getFormattedContent(
          this._contentFormatter,
          this._metadataMode,
        ),
      );

      if (tokenCount > this._maxInputTokenCount) {
        throw new Error(
          "Tokens in a single document exceeds the maximum number of allowed input tokens",
        );
      }

      documentTokens.set(document, tokenCount);
    }

    for (const [document, tokenCount] of documentTokens) {
      currentSize += tokenCount;
      if (currentSize > this._maxInputTokenCount) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = tokenCount;
      }
      currentBatch.push(document);
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}
