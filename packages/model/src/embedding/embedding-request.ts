import type { ModelRequest } from "../model";
import type { EmbeddingOptions } from "./embedding-options.interface";

/**
 * Request to embed a list of input instructions.
 */
export class EmbeddingRequest implements ModelRequest<string[]> {
  private readonly _inputs: string[];
  private readonly _options: EmbeddingOptions | null;

  constructor(inputs: string[], options: EmbeddingOptions | null = null) {
    this._inputs = inputs;
    this._options = options;
  }

  get instructions(): string[] {
    return this._inputs;
  }

  get options(): EmbeddingOptions | null {
    return this._options;
  }
}
