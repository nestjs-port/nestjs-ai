import type {
  MeterRegistry,
  ObservationContext,
  ObservationHandler,
} from "@nestjs-port/core";
import { ModelUsageMetricsGenerator } from "../../model/observation/model-usage-metrics-generator.js";
import { EmbeddingModelObservationContext } from "./embedding-model-observation-context.js";

export class EmbeddingModelMeterObservationHandler implements ObservationHandler<EmbeddingModelObservationContext> {
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
