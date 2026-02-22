import type { Document } from "@nestjs-ai/commons";
import type { ModelRequest } from "../model";
import { EmbeddingOptions } from "./embedding-options.interface";

function isEmbeddingOptions(value: unknown): value is EmbeddingOptions {
  return (
    value != null &&
    typeof value === "object" &&
    "copy" in value &&
    typeof (value as EmbeddingOptions).dimensions === "function"
  );
}

/**
 * Represents a request to embed a list of documents.
 */
export class DocumentEmbeddingRequest implements ModelRequest<Document[]> {
  private readonly _inputs: Document[];
  private readonly _options: EmbeddingOptions;

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
      if (isEmbeddingOptions(arg2)) {
        this._options = arg2;
      } else {
        this._options = EmbeddingOptions.builder().build();
      }
      return;
    }

    this._inputs = [
      arg1,
      ...(isEmbeddingOptions(arg2) ? [] : arg2 ? [arg2] : []),
      ...rest,
    ].filter(Boolean) as Document[];
    this._options = isEmbeddingOptions(arg2)
      ? arg2
      : EmbeddingOptions.builder().build();
  }

  get instructions(): Document[] {
    return this._inputs;
  }

  get options(): EmbeddingOptions {
    return this._options;
  }
}
