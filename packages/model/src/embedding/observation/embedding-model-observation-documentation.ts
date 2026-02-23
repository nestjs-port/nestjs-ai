import { ObservationDocumentation } from "@nestjs-ai/commons";

import { DefaultEmbeddingModelObservationConvention } from "./default-embedding-model-observation-convention";

export class EmbeddingModelObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "EMBEDDING_MODEL_OPERATION";
  }

  get defaultConvention() {
    return DefaultEmbeddingModelObservationConvention;
  }
}
