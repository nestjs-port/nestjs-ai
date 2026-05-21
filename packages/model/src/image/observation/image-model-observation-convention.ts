import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-port/core";

import { ImageModelObservationContext } from "./image-model-observation-context.js";

export abstract class ImageModelObservationConvention implements ObservationConvention<ImageModelObservationContext> {
  abstract getName(): string;

  abstract getContextualName(context: ImageModelObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is ImageModelObservationContext {
    return context instanceof ImageModelObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues;
}
