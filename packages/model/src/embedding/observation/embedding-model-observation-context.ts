import { AiOperationMetadata, AiOperationType } from "@nestjs-ai/commons";
import { ModelObservationContext } from "../../model";
import type { EmbeddingRequest } from "../embedding-request";
import type { EmbeddingResponse } from "../embedding-response";

export class EmbeddingModelObservationContext extends ModelObservationContext<
  EmbeddingRequest,
  EmbeddingResponse
> {
  constructor(embeddingRequest: EmbeddingRequest, provider: string) {
    super(
      embeddingRequest,
      new AiOperationMetadata(AiOperationType.EMBEDDING.value, provider),
    );
  }
}
