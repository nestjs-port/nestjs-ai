import type { ChatOptions } from "../../chat";

/**
 * Mixin interface for ChatModels that support structured output. Provides a unified way
 * to set and get the output JSON schema.
 */
export interface StructuredOutputChatOptions extends ChatOptions {
	get outputSchema(): string;

	set outputSchema(outputSchema: string);
}
