import type { Media } from "@nestjs-ai/commons";
import type { Message } from "../messages";

export interface PromptTemplateMessageActions {
  createMessage(): Message;

  createMessage(mediaList: Media[]): Message;

  createMessage(model: Record<string, unknown>): Message;
}
