import type { Model } from "../model/model.interface.js";
import type { DocumentEmbeddingRequest } from "./document-embedding-request.js";
import type { EmbeddingResponse } from "./embedding-response.js";

/**
 * EmbeddingModel is a generic interface for embedding models.
 */
export interface DocumentEmbeddingModel extends Model<
  DocumentEmbeddingRequest,
  EmbeddingResponse
> {
  dimensions(): Promise<number>;
}
