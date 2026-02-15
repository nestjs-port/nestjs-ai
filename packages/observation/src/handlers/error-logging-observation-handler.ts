import {
	type Logger,
	LoggerFactory,
	ObservationContext,
	type ObservationHandler,
} from "@nestjs-ai/commons";

/**
 * Observation handler that logs errors during observation lifecycle.
 */
export class ErrorLoggingObservationHandler
	implements ObservationHandler<ObservationContext>
{
	private readonly logger: Logger = LoggerFactory.getLogger(
		ErrorLoggingObservationHandler.name,
	);

	supportsContext(context: ObservationContext): context is ObservationContext {
		return context instanceof ObservationContext;
	}

	onError(context: ObservationContext): void {
		if (context.error) {
			this.logger.error(
				`Observation error [${context.name}]: ${context.error.message}`,
				context.error,
			);
		}
	}
}
