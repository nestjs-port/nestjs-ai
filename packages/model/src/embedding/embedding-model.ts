import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import type { Model } from "../model";
import type { BatchingStrategy } from "./batching-strategy.interface";
import { EmbeddingOptions } from "./embedding-options.interface";
import { EmbeddingRequest } from "./embedding-request";
import type { EmbeddingResponse } from "./embedding-response";

/**
 * EmbeddingModel is a generic interface for embedding models.
 */
export abstract class EmbeddingModel
  implements Model<EmbeddingRequest, EmbeddingResponse>
{
  abstract call(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Embeds the given document's content into a vector.
   */
  protected abstract embedDocument(document: Document): Promise<number[]>;

  /**
   * Embeds the given text into a vector.
   */
  async embed(text: string): Promise<number[]>;
  async embed(document: Document): Promise<number[]>;
  async embed(texts: string[]): Promise<number[][]>;
  async embed(
    documents: Document[],
    options: EmbeddingOptions | null,
    batchingStrategy: BatchingStrategy,
  ): Promise<number[][]>;
  async embed(
    input: string | Document | string[] | Document[],
    options?: EmbeddingOptions | null,
    batchingStrategy?: BatchingStrategy,
  ): Promise<number[] | number[][]> {
    assert(input != null, "Input must not be null");

    if (typeof input === "string") {
      const response = await this.embedTexts([input]);
      return response[0];
    }

    if (!Array.isArray(input)) {
      return this.embedDocument(input);
    }

    if (input.length === 0) {
      return [];
    }

    if (typeof input[0] === "string") {
      return this.embedTexts(input as string[]);
    }

    assert(batchingStrategy != null, "BatchingStrategy must not be null");
    return this.embedDocumentBatch(
      input as Document[],
      options ?? null,
      batchingStrategy,
    );
  }

  /**
   * Extracts the text content from a {@link Document} to be used for embedding.
   */
  getEmbeddingContent(document: Document): string | null {
    assert(document != null, "Document must not be null");
    return document.text;
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    assert(texts != null, "Texts must not be null");
    const response = await this.call(
      new EmbeddingRequest(texts, EmbeddingOptions.builder().build()),
    );

    return response.results.map((embedding) => embedding.output);
  }

  private async embedDocumentBatch(
    documents: Document[],
    options: EmbeddingOptions | null,
    batchingStrategy: BatchingStrategy,
  ): Promise<number[][]> {
    assert(documents != null, "Documents must not be null");

    const embeddings: number[][] = [];
    const batches = batchingStrategy.batch(documents);

    for (const subBatch of batches) {
      const texts = subBatch.map((document) =>
        this.getEmbeddingContent(document),
      );
      const request = new EmbeddingRequest(
        texts.map((text) => text ?? ""),
        options,
      );
      const response = await this.call(request);

      for (let i = 0; i < subBatch.length; i += 1) {
        embeddings.push(response.results[i].output);
      }
    }

    assert(
      embeddings.length === documents.length,
      "Embeddings must have the same number as that of the documents",
    );

    return embeddings;
  }

  /**
   * Embeds a batch of texts into vectors and returns the {@link EmbeddingResponse}.
   */
  async embedForResponse(texts: string[]): Promise<EmbeddingResponse> {
    assert(texts != null, "Texts must not be null");
    return this.call(
      new EmbeddingRequest(texts, EmbeddingOptions.builder().build()),
    );
  }

  /**
   * Get the number of dimensions of the embedded vectors.
   */
  async dimensions(): Promise<number> {
    return (await this.embed("Test String")).length;
  }
}
