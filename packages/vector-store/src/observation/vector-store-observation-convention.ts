import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { VectorStoreObservationContext } from "./vector-store-observation-context";

export abstract class VectorStoreObservationConvention
  implements ObservationConvention<VectorStoreObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: VectorStoreObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is VectorStoreObservationContext {
    return context instanceof VectorStoreObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: VectorStoreObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: VectorStoreObservationContext,
  ): KeyValues;
}
