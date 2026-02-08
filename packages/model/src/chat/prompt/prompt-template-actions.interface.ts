import type { ChatOptions } from "./chat-options.interface";
import type { Prompt } from "./prompt";
import type { PromptTemplateStringActions } from "./prompt-template-string-actions.interface";

export interface PromptTemplateActions extends PromptTemplateStringActions {
	create(): Prompt;

	create(modelOptions: ChatOptions): Prompt;

	create(model: Record<string, unknown>): Prompt;

	create(model: Record<string, unknown>, modelOptions: ChatOptions): Prompt;
}
