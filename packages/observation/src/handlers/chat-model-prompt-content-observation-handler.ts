import {
	type Logger,
	LoggerFactory,
	type ObservationContext,
	type ObservationHandler,
} from "@nestjs-ai/commons";
import { ChatModelObservationContext } from "@nestjs-ai/model";

/**
 * Observation handler that logs chat model prompt (request) content.
 */
export class ChatModelPromptContentObservationHandler
	implements ObservationHandler<ChatModelObservationContext>
{
	private readonly logger: Logger = LoggerFactory.getLogger(
		ChatModelPromptContentObservationHandler.name,
	);

	supportsContext(
		context: ObservationContext,
	): context is ChatModelObservationContext {
		return context instanceof ChatModelObservationContext;
	}

	onStart(context: ChatModelObservationContext): void {
		const instructions = context.request.instructions;
		if (instructions.length > 0) {
			const content = instructions.map((m) => m.text ?? "").join("\n");
			this.logger.info(`Chat model prompt: ${content}`);
		}
	}
}
