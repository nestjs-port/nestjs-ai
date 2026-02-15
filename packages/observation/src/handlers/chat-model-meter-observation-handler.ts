import type {
	ObservationContext,
	ObservationHandler,
} from "@nestjs-ai/commons";
import { ChatModelObservationContext } from "@nestjs-ai/model";
import type { Meter } from "@opentelemetry/api";
import { ModelUsageMetricsGenerator } from "../metrics/model-usage-metrics-generator";

/**
 * Observation handler that records token usage metrics for chat model operations.
 */
export class ChatModelMeterObservationHandler
	implements ObservationHandler<ChatModelObservationContext>
{
	private readonly _metricsGenerator: ModelUsageMetricsGenerator;

	constructor(meter: Meter) {
		this._metricsGenerator = new ModelUsageMetricsGenerator(meter);
	}

	supportsContext(
		context: ObservationContext,
	): context is ChatModelObservationContext {
		return context instanceof ChatModelObservationContext;
	}

	onStop(context: ChatModelObservationContext): void {
		this._metricsGenerator.generate(context);
	}
}
