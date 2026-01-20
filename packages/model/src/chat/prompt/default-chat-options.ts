import type { ChatOptions } from "./chat-options.interface";

/**
 * Default implementation for the ChatOptions interface.
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

	copy(): ChatOptions {
		const copy = new DefaultChatOptions();
		if (this.model != null) {
			copy.model = this.model;
		}
		if (this.frequencyPenalty != null) {
			copy.frequencyPenalty = this.frequencyPenalty;
		}
		if (this.maxTokens != null) {
			copy.maxTokens = this.maxTokens;
		}
		if (this.presencePenalty != null) {
			copy.presencePenalty = this.presencePenalty;
		}
		if (this.stopSequences != null) {
			copy.stopSequences = [...this.stopSequences];
		}
		if (this.temperature != null) {
			copy.temperature = this.temperature;
		}
		if (this.topK != null) {
			copy.topK = this.topK;
		}
		if (this.topP != null) {
			copy.topP = this.topP;
		}
		return copy;
	}

	/**
	 * Create a new builder for DefaultChatOptions.
	 */
	static builder(): DefaultChatOptionsBuilder {
		return new DefaultChatOptionsBuilder();
	}
}

/**
 * Builder for DefaultChatOptions.
 */
export class DefaultChatOptionsBuilder {
	protected options: DefaultChatOptions;

	constructor() {
		this.options = new DefaultChatOptions();
	}

	model(model: string): DefaultChatOptionsBuilder {
		this.options.model = model;
		return this;
	}

	frequencyPenalty(frequencyPenalty: number): DefaultChatOptionsBuilder {
		this.options.frequencyPenalty = frequencyPenalty;
		return this;
	}

	maxTokens(maxTokens: number): DefaultChatOptionsBuilder {
		this.options.maxTokens = maxTokens;
		return this;
	}

	presencePenalty(presencePenalty: number): DefaultChatOptionsBuilder {
		this.options.presencePenalty = presencePenalty;
		return this;
	}

	stopSequences(stopSequences: string[]): DefaultChatOptionsBuilder {
		this.options.stopSequences = stopSequences;
		return this;
	}

	temperature(temperature: number): DefaultChatOptionsBuilder {
		this.options.temperature = temperature;
		return this;
	}

	topK(topK: number): DefaultChatOptionsBuilder {
		this.options.topK = topK;
		return this;
	}

	topP(topP: number): DefaultChatOptionsBuilder {
		this.options.topP = topP;
		return this;
	}

	build(): ChatOptions {
		return this.options.copy();
	}
}
