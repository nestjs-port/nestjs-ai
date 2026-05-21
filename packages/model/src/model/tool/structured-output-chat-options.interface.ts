import type { ChatOptions } from "../../chat/prompt/chat-options.interface.js";

/**
 * Mixin interface for ChatModels that support structured output. Provides a unified way
 * to set and get the output JSON schema.
 */
export interface StructuredOutputChatOptions extends ChatOptions {
  get outputSchema(): string | null;

  setOutputSchema(outputSchema: string | null): void;
}

export namespace StructuredOutputChatOptions {
  export interface Builder extends ChatOptions.Builder {
    outputSchema(outputSchema: string | null): this;
  }
}
