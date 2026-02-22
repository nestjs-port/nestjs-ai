import { ObservationDocumentation } from "@nestjs-ai/commons";

import { DefaultVectorStoreObservationConvention } from "./default-vector-store-observation-convention";

export class VectorStoreObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_VECTOR_STORE";
  }

  override get defaultConvention() {
    return DefaultVectorStoreObservationConvention;
  }
}
