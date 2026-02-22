import type { ModelResult } from "../model";
import { EmbeddingResultMetadata } from "./embedding-result-metadata";

/**
 * Represents a single embedding vector.
 */
export class Embedding implements ModelResult<number[]> {
  private readonly _embedding: number[];
  private readonly _index: number;
  private readonly _metadata: EmbeddingResultMetadata;

  /**
   * Creates a new {@link Embedding} instance.
   */
  constructor(
    embedding: number[],
    index: number,
    metadata: EmbeddingResultMetadata = EmbeddingResultMetadata.EMPTY,
  ) {
    this._embedding = embedding;
    this._index = index;
    this._metadata = metadata;
  }

  get output(): number[] {
    return this._embedding;
  }

  get index(): number {
    return this._index;
  }

  get metadata(): EmbeddingResultMetadata {
    return this._metadata;
  }
}
