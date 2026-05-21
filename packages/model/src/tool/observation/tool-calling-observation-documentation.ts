import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultToolCallingObservationConvention } from "./default-tool-calling-observation-convention.js";

export class ToolCallingObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "TOOL_CALL_OPERATION";
  }

  get defaultConvention() {
    return DefaultToolCallingObservationConvention;
  }
}
