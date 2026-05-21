import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultVectorStoreObservationConvention } from "./default-vector-store-observation-convention.js";

export class VectorStoreObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_VECTOR_STORE";
  }

  override get defaultConvention() {
    return DefaultVectorStoreObservationConvention;
  }
}
