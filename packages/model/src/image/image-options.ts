import type { ModelOptions } from "../model/model-options.interface.js";

/**
 * Image options represent the common options portable across different image generation models.
 */
export interface ImageOptions extends ModelOptions {
  get n(): number | null;

  get model(): string | null;

  get width(): number | null;

  get height(): number | null;

  get responseFormat(): string | null;

  get style(): string | null;
}
