import type { Model } from "../model";
import type { DocumentEmbeddingRequest } from "./document-embedding-request";
import type { EmbeddingResponse } from "./embedding-response";

/**
 * EmbeddingModel is a generic interface for embedding models.
 */
export interface DocumentEmbeddingModel
  extends Model<DocumentEmbeddingRequest, EmbeddingResponse> {
  dimensions(): Promise<number>;
}
