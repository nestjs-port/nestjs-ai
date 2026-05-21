import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultEmbeddingModelObservationConvention } from "./default-embedding-model-observation-convention.js";

export class EmbeddingModelObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "EMBEDDING_MODEL_OPERATION";
  }

  get defaultConvention() {
    return DefaultEmbeddingModelObservationConvention;
  }
}
