import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { EmbeddingModelObservationContext } from "./embedding-model-observation-context";

export abstract class EmbeddingModelObservationConvention
  implements ObservationConvention<EmbeddingModelObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: EmbeddingModelObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is EmbeddingModelObservationContext {
    return context instanceof EmbeddingModelObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: EmbeddingModelObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: EmbeddingModelObservationContext,
  ): KeyValues;
}
