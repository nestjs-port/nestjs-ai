import {
  LoggerFactory,
  type ObservationContext,
  type ObservationHandler,
  StringUtils,
} from "@nestjs-ai/commons";
import { ChatClientObservationContext } from "./chat-client-observation-context";

export class ChatClientCompletionObservationHandler
  implements ObservationHandler<ChatClientObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    ChatClientCompletionObservationHandler.name,
  );

  onStop(context: ChatClientObservationContext): void {
    this.logger.info(
      `Chat Client Completion:\n${this.concatenateStrings(this.completion(context))}`,
    );
  }

  private completion(context: ChatClientObservationContext): string[] {
    const chatResponse = context.response?.chatResponse;
    if (chatResponse == null) {
      return [];
    }

    return chatResponse.results
      .map((generation) => generation.output.text)
      .filter(StringUtils.hasText);
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatClientObservationContext {
    return context instanceof ChatClientObservationContext;
  }

  private concatenateStrings(strings: string[]): string {
    const quotedStrings = strings.map((value) => `"${value}"`);
    return `[${quotedStrings.join(", ")}]`;
  }
}
