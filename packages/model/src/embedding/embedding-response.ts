import assert from "node:assert/strict";
import type { ModelResponse } from "../model";
import type { Embedding } from "./embedding";
import { EmbeddingResponseMetadata } from "./embedding-response-metadata";

/**
 * Embedding response object.
 */
export class EmbeddingResponse implements ModelResponse<Embedding> {
  /**
   * Embedding data.
   */
  private readonly _embeddings: Embedding[];

  /**
   * Embedding metadata.
   */
  private readonly _metadata: EmbeddingResponseMetadata;

  /**
   * Creates a new {@link EmbeddingResponse} instance.
   */
  constructor(
    embeddings: Embedding[],
    metadata: EmbeddingResponseMetadata = new EmbeddingResponseMetadata(),
  ) {
    this._embeddings = embeddings;
    this._metadata = metadata;
  }

  get metadata(): EmbeddingResponseMetadata {
    return this._metadata;
  }

  get result(): Embedding {
    assert(this._embeddings.length > 0, "No embedding data available.");
    return this._embeddings[0];
  }

  get results(): Embedding[] {
    return this._embeddings;
  }
}
