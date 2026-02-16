import type {
  KeyValue,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { AdvisorObservationContext } from "./advisor-observation-context";

export abstract class AdvisorObservationConvention
  implements ObservationConvention<AdvisorObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: AdvisorObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is AdvisorObservationContext {
    return context instanceof AdvisorObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValue[];

  abstract getHighCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValue[];
}
