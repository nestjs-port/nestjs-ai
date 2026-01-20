import type { ChatOptions } from "./chat-options.interface";

export interface CreateDefaultChatOptions {
	model?: string | null;
	frequencyPenalty?: number | null;
	maxTokens?: number | null;
	presencePenalty?: number | null;
	stopSequences?: string[] | null;
	temperature?: number | null;
	topK?: number | null;
	topP?: number | null;
}

/**
 * Default implementation for the {@link ChatOptions}.
 */
export class DefaultChatOptions implements ChatOptions {
	model?: string | null;
	frequencyPenalty?: number | null;
	maxTokens?: number | null;
	presencePenalty?: number | null;
	stopSequences?: string[] | null;
	temperature?: number | null;
	topK?: number | null;
	topP?: number | null;

	constructor(options?: CreateDefaultChatOptions) {
		if (options) {
			this.model = options.model;
			this.frequencyPenalty = options.frequencyPenalty;
			this.maxTokens = options.maxTokens;
			this.presencePenalty = options.presencePenalty;
			this.stopSequences = options.stopSequences;
			this.temperature = options.temperature;
			this.topK = options.topK;
			this.topP = options.topP;
		}
	}

	copy(): ChatOptions {
		return new DefaultChatOptions({
			model: this.model,
			frequencyPenalty: this.frequencyPenalty,
			maxTokens: this.maxTokens,
			presencePenalty: this.presencePenalty,
			stopSequences: this.stopSequences ? [...this.stopSequences] : null,
			temperature: this.temperature,
			topK: this.topK,
			topP: this.topP,
		});
	}
}
