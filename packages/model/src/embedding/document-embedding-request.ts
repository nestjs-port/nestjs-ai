import type { Document } from "@nestjs-ai/commons";
import type { ModelRequest } from "../model";
import { EmbeddingOptions } from "./embedding-options.interface";

/**
 * Represents a request to embed a list of documents.
 */
export class DocumentEmbeddingRequest implements ModelRequest<Document[]> {
  private readonly _inputs: Document[];
  private readonly _options: EmbeddingOptions;

  private static resolveOptions(
    value?: Document | EmbeddingOptions,
  ): EmbeddingOptions {
    return isEmbeddingOptions(value)
      ? value
      : EmbeddingOptions.builder().build();
  }

  constructor(...inputs: Document[]);
  constructor(inputs: Document[]);
  constructor(inputs: Document[], options: EmbeddingOptions);
  constructor(
    arg1: Document[] | Document,
    arg2?: Document | EmbeddingOptions,
    ...rest: Document[]
  ) {
    if (Array.isArray(arg1)) {
      this._inputs = arg1;
      this._options = DocumentEmbeddingRequest.resolveOptions(arg2);
      return;
    }

    const hasOptions = isEmbeddingOptions(arg2);
    const secondInput = !hasOptions && arg2 ? [arg2] : [];

    this._inputs = [arg1, ...secondInput, ...rest].filter(
      Boolean,
    ) as Document[];
    this._options = DocumentEmbeddingRequest.resolveOptions(arg2);
  }

  get instructions(): Document[] {
    return this._inputs;
  }

  get options(): EmbeddingOptions {
    return this._options;
  }
}

function isEmbeddingOptions(value: unknown): value is EmbeddingOptions {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as {
    model?: unknown;
    dimensions?: unknown;
  };

  return (
    (candidate.model === null || typeof candidate.model === "string") &&
    (candidate.dimensions === null || typeof candidate.dimensions === "number")
  );
}
