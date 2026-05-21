import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultImageModelObservationConvention } from "./default-image-model-observation-convention.js";

export class ImageModelObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "IMAGE_MODEL_OPERATION";
  }

  get defaultConvention() {
    return DefaultImageModelObservationConvention;
  }
}
