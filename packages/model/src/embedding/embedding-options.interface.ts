import type { ModelOptions } from "../model";
import { DefaultEmbeddingOptions } from "./default-embedding-options";

/**
 * Options for embedding models.
 */
export interface EmbeddingOptions extends ModelOptions {
  /**
   * Returns the model to use for the embedding.
   */
  model?: string | null;

  /**
   * Returns the number of output dimensions for the embedding.
   */
  dimensions?: number | null;
}

export namespace EmbeddingOptions {
  export function builder(): Builder {
    return DefaultEmbeddingOptions.builder();
  }

  export interface Builder {
    model(model: string | null): Builder;

    dimensions(dimensions: number | null): Builder;

    build(): EmbeddingOptions;
  }
}
