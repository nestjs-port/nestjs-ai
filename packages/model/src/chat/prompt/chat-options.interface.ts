import type { ModelOptions } from "../../model";

/**
 * {@link ModelOptions} representing the common options that are portable across different
 * chat models.
 */
export interface ChatOptions extends ModelOptions {
	/**
	 * Returns the model to use for the chat.
	 * @returns the model to use for the chat
	 */
	model?: string | null;

	/**
	 * Returns the frequency penalty to use for the chat.
	 * @returns the frequency penalty to use for the chat
	 */
	frequencyPenalty?: number | null;

	/**
	 * Returns the maximum number of tokens to use for the chat.
	 * @returns the maximum number of tokens to use for the chat
	 */
	maxTokens?: number | null;

	/**
	 * Returns the presence penalty to use for the chat.
	 * @returns the presence penalty to use for the chat
	 */
	presencePenalty?: number | null;

	/**
	 * Returns the stop sequences to use for the chat.
	 * @returns the stop sequences to use for the chat
	 */
	stopSequences?: string[] | null;

	/**
	 * Returns the temperature to use for the chat.
	 * @returns the temperature to use for the chat
	 */
	temperature?: number | null;

	/**
	 * Returns the top K to use for the chat.
	 * @returns the top K to use for the chat
	 */
	topK?: number | null;

	/**
	 * Returns the top P to use for the chat.
	 * @returns the top P to use for the chat
	 */
	topP?: number | null;

	/**
	 * Returns a copy of this {@link ChatOptions}.
	 * @returns a copy of this {@link ChatOptions}
	 */
	copy(): ChatOptions;
}

/**
 * Builder for creating {@link ChatOptions} instance.
 */
export interface ChatOptionsBuilder {
	/**
	 * Builds with the model to use for the chat.
	 * @param model the model to use
	 * @returns the builder
	 */
	model(model: string | null): ChatOptionsBuilder;

	/**
	 * Builds with the frequency penalty to use for the chat.
	 * @param frequencyPenalty the frequency penalty to use
	 * @returns the builder
	 */
	frequencyPenalty(frequencyPenalty: number | null): ChatOptionsBuilder;

	/**
	 * Builds with the maximum number of tokens to use for the chat.
	 * @param maxTokens the maximum number of tokens to use
	 * @returns the builder
	 */
	maxTokens(maxTokens: number | null): ChatOptionsBuilder;

	/**
	 * Builds with the presence penalty to use for the chat.
	 * @param presencePenalty the presence penalty to use
	 * @returns the builder
	 */
	presencePenalty(presencePenalty: number | null): ChatOptionsBuilder;

	/**
	 * Builds with the stop sequences to use for the chat.
	 * @param stopSequences the stop sequences to use
	 * @returns the builder
	 */
	stopSequences(stopSequences: string[] | null): ChatOptionsBuilder;

	/**
	 * Builds with the temperature to use for the chat.
	 * @param temperature the temperature to use
	 * @returns the builder
	 */
	temperature(temperature: number | null): ChatOptionsBuilder;

	/**
	 * Builds with the top K to use for the chat.
	 * @param topK the top K to use
	 * @returns the builder
	 */
	topK(topK: number | null): ChatOptionsBuilder;

	/**
	 * Builds with the top P to use for the chat.
	 * @param topP the top P to use
	 * @returns the builder
	 */
	topP(topP: number | null): ChatOptionsBuilder;

	/**
	 * Build the {@link ChatOptions}.
	 * @returns the Chat options
	 */
	build(): ChatOptions;
}

class DefaultChatOptions implements ChatOptions {
	model?: string | null;
	frequencyPenalty?: number | null;
	maxTokens?: number | null;
	presencePenalty?: number | null;
	stopSequences?: string[] | null;
	temperature?: number | null;
	topK?: number | null;
	topP?: number | null;

	constructor(options?: Partial<ChatOptions>) {
		if (options) {
			this.model = options.model;
			this.frequencyPenalty = options.frequencyPenalty;
			this.maxTokens = options.maxTokens;
			this.presencePenalty = options.presencePenalty;
			this.stopSequences = options.stopSequences
				? [...options.stopSequences]
				: null;
			this.temperature = options.temperature;
			this.topK = options.topK;
			this.topP = options.topP;
		}
	}

	copy(): ChatOptions {
		return new DefaultChatOptions(this);
	}
}

class DefaultChatOptionsBuilder implements ChatOptionsBuilder {
	private options: Partial<ChatOptions> = {};

	model(model: string | null): ChatOptionsBuilder {
		this.options.model = model;
		return this;
	}

	frequencyPenalty(frequencyPenalty: number | null): ChatOptionsBuilder {
		this.options.frequencyPenalty = frequencyPenalty;
		return this;
	}

	maxTokens(maxTokens: number | null): ChatOptionsBuilder {
		this.options.maxTokens = maxTokens;
		return this;
	}

	presencePenalty(presencePenalty: number | null): ChatOptionsBuilder {
		this.options.presencePenalty = presencePenalty;
		return this;
	}

	stopSequences(stopSequences: string[] | null): ChatOptionsBuilder {
		this.options.stopSequences = stopSequences ? [...stopSequences] : null;
		return this;
	}

	temperature(temperature: number | null): ChatOptionsBuilder {
		this.options.temperature = temperature;
		return this;
	}

	topK(topK: number | null): ChatOptionsBuilder {
		this.options.topK = topK;
		return this;
	}

	topP(topP: number | null): ChatOptionsBuilder {
		this.options.topP = topP;
		return this;
	}

	build(): ChatOptions {
		return new DefaultChatOptions(this.options);
	}
}

/**
 * Creates a new {@link ChatOptionsBuilder} to create the default {@link ChatOptions}.
 * @returns Returns a new {@link ChatOptionsBuilder}.
 */
export function chatOptionsBuilder(): ChatOptionsBuilder {
	return new DefaultChatOptionsBuilder();
}
