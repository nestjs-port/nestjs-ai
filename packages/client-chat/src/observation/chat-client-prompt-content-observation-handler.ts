import {
  LoggerFactory,
  ObservabilityHelper,
  type ObservationContext,
  type ObservationHandler,
} from "@nestjs-ai/commons";
import type { Message } from "@nestjs-ai/model";
import { ChatClientObservationContext } from "./chat-client-observation-context";

export class ChatClientPromptContentObservationHandler
  implements ObservationHandler<ChatClientObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    ChatClientPromptContentObservationHandler.name,
  );

  onStop(context: ChatClientObservationContext): void {
    this.logger.info(
      `Chat Client Prompt Content:\n${ObservabilityHelper.concatenateEntries(this.processPrompt(context))}`,
    );
  }

  private processPrompt(
    context: ChatClientObservationContext,
  ): Record<string, unknown> {
    const instructions = context.request.prompt.instructions;
    if (instructions.length === 0) {
      return {};
    }

    const messages: Record<string, unknown> = {};
    instructions.forEach((message: Message) => {
      messages[message.messageType.getValue()] = message.text;
    });
    return messages;
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatClientObservationContext {
    return context instanceof ChatClientObservationContext;
  }
}
