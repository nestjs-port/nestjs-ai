import type {
  MeterRegistry,
  ObservationContext,
  ObservationHandler,
} from "@nestjs-port/core";
import { ModelUsageMetricsGenerator } from "../../model/observation/model-usage-metrics-generator.js";
import { ChatModelObservationContext } from "./chat-model-observation-context.js";

export class ChatModelMeterObservationHandler implements ObservationHandler<ChatModelObservationContext> {
  private readonly _meterRegistry: MeterRegistry;

  constructor(meterRegistry: MeterRegistry) {
    this._meterRegistry = meterRegistry;
  }

  onStop(context: ChatModelObservationContext): void {
    const usage = context.response?.metadata?.usage;
    if (usage != null) {
      ModelUsageMetricsGenerator.generate(usage, context, this._meterRegistry);
    }
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatModelObservationContext {
    return context instanceof ChatModelObservationContext;
  }
}
