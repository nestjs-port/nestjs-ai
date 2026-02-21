import {
  LoggerFactory,
  ObservabilityHelper,
  type ObservationContext,
  type ObservationHandler,
  StringUtils,
} from "@nestjs-ai/commons";
import { ChatModelObservationContext } from "./chat-model-observation-context";

export class ChatModelCompletionObservationHandler
  implements ObservationHandler<ChatModelObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    ChatModelCompletionObservationHandler.name,
  );

  onStop(context: ChatModelObservationContext): void {
    this.logger.info(
      `Chat Model Completion:\n${ObservabilityHelper.concatenateStrings(this.completion(context))}`,
    );
  }

  private completion(context: ChatModelObservationContext): string[] {
    const results = context.response?.results;
    if (results == null || results.length === 0) {
      return [];
    }

    return results
      .map((generation) => generation.output?.text)
      .filter((text): text is string => StringUtils.hasText(text));
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatModelObservationContext {
    return context instanceof ChatModelObservationContext;
  }
}
