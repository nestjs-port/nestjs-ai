import { ObservationDocumentation } from "@nestjs-ai/commons";

import { DefaultToolCallingObservationConvention } from "./default-tool-calling-observation-convention";

export class ToolCallingObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "TOOL_CALL_OPERATION";
  }

  get defaultConvention() {
    return DefaultToolCallingObservationConvention;
  }
}
