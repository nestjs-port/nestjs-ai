import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultAdvisorObservationConvention } from "./default-advisor-observation-convention.js";

export class AdvisorObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_ADVISOR";
  }

  override get defaultConvention() {
    return DefaultAdvisorObservationConvention;
  }
}
