import type { Document } from "@nestjs-ai/commons";

/**
 * Contract for batching {@link Document} objects so that the call to embed them could be
 * optimized.
 */
export interface BatchingStrategy {
  /**
   * EmbeddingModel implementations can call this method to optimize embedding tokens.
   * The incoming collection of {@link Document}s are split into sub-batches. It is
   * important to preserve the order of the list of {@link Document}s when batching as
   * they are mapped to their corresponding embeddings by their order.
   */
  batch(documents: Document[]): Document[][];
}
