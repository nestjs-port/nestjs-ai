import type {
  MeterRegistry,
  ObservationContext,
  ObservationHandler,
} from "@nestjs-ai/commons";
import { ModelUsageMetricsGenerator } from "../../model";
import { ChatModelObservationContext } from "./chat-model-observation-context";

export interface ChatModelMeterObservationHandlerProps {
  meterRegistry: MeterRegistry;
}

export class ChatModelMeterObservationHandler
  implements ObservationHandler<ChatModelObservationContext>
{
  private readonly _meterRegistry: MeterRegistry;

  constructor(props: ChatModelMeterObservationHandlerProps) {
    this._meterRegistry = props.meterRegistry;
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
