import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-port/core";

import { AdvisorObservationContext } from "./advisor-observation-context.js";

export abstract class AdvisorObservationConvention implements ObservationConvention<AdvisorObservationContext> {
  abstract getName(): string;

  abstract getContextualName(context: AdvisorObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is AdvisorObservationContext {
    return context instanceof AdvisorObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValues;
}
