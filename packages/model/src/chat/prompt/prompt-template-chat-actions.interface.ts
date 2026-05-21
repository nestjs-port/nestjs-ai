import type { Message } from "../messages/message.interface.js";

export interface PromptTemplateChatActions {
  createMessages(): Message[];

  createMessages(model: Record<string, unknown>): Message[];
}
