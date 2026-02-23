import type {
  MeterRegistry,
  ObservationContext,
  ObservationHandler,
} from "@nestjs-ai/commons";

import { ModelUsageMetricsGenerator } from "../../model";
import { EmbeddingModelObservationContext } from "./embedding-model-observation-context";

export class EmbeddingModelMeterObservationHandler
  implements ObservationHandler<EmbeddingModelObservationContext>
{
  private readonly _meterRegistry: MeterRegistry;

  constructor(meterRegistry: MeterRegistry) {
    this._meterRegistry = meterRegistry;
  }

  onStop(context: EmbeddingModelObservationContext): void {
    const usage = context.response?.metadata?.usage;
    if (usage != null) {
      ModelUsageMetricsGenerator.generate(usage, context, this._meterRegistry);
    }
  }

  supportsContext(
    context: ObservationContext,
  ): context is EmbeddingModelObservationContext {
    return context instanceof EmbeddingModelObservationContext;
  }
}
