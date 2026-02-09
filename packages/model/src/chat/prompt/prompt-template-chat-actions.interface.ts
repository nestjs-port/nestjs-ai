import type { Message } from "../messages";

export interface PromptTemplateChatActions {
	createMessages(): Message[];

	createMessages(model: Record<string, unknown>): Message[];
}
