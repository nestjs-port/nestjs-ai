import { DefaultEmbeddingOptionsBuilder } from "./default-embedding-options-builder";
import type { EmbeddingOptions } from "./embedding-options.interface";

export type DefaultEmbeddingOptionsProps = Partial<EmbeddingOptions>;

/**
 * Default implementation of {@link EmbeddingOptions}.
 */
export class DefaultEmbeddingOptions implements EmbeddingOptions {
  model?: string | null = null;
  dimensions?: number | null = null;

  constructor(options?: DefaultEmbeddingOptionsProps) {
    if (options) {
      this.model = options.model ?? null;
      this.dimensions = options.dimensions ?? null;
    }
  }

  static builder(): DefaultEmbeddingOptionsBuilder {
    return new DefaultEmbeddingOptionsBuilder();
  }
}
