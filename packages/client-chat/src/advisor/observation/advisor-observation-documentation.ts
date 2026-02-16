import { ObservationDocumentation } from "@nestjs-ai/commons";

import { DefaultAdvisorObservationConvention } from "./default-advisor-observation-convention";

export class AdvisorObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_ADVISOR";
  }

  override get defaultConvention() {
    return DefaultAdvisorObservationConvention;
  }
}
