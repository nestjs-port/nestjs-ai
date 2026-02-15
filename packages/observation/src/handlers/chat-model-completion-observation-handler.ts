import {
	type Logger,
	LoggerFactory,
	type ObservationContext,
	type ObservationHandler,
} from "@nestjs-ai/commons";
import { ChatModelObservationContext } from "@nestjs-ai/model";

/**
 * Observation handler that logs chat model completion (response) content.
 */
export class ChatModelCompletionObservationHandler
	implements ObservationHandler<ChatModelObservationContext>
{
	private readonly logger: Logger = LoggerFactory.getLogger(
		ChatModelCompletionObservationHandler.name,
	);

	supportsContext(
		context: ObservationContext,
	): context is ChatModelObservationContext {
		return context instanceof ChatModelObservationContext;
	}

	onStop(context: ChatModelObservationContext): void {
		const response = context.response;
		if (!response) {
			return;
		}

		const result = response.result;
		if (result) {
			const text = result.output.text;
			if (text) {
				this.logger.info(`Chat model completion: ${text}`);
			}
		}
	}
}
