import { DefaultEmbeddingOptions } from "./default-embedding-options";
import type { EmbeddingOptions } from "./embedding-options.interface";

export class DefaultEmbeddingOptionsBuilder
  implements EmbeddingOptions.Builder
{
  private readonly _options = new DefaultEmbeddingOptions();

  model(model: string | null): this {
    this._options.model = model;
    return this;
  }

  dimensions(dimensions: number | null): this {
    this._options.dimensions = dimensions;
    return this;
  }

  build(): EmbeddingOptions {
    return this._options;
  }
}
