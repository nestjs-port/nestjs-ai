import { AbstractResponseMetadata, type ResponseMetadata } from "../../model";
import { EmptyRateLimit } from "./empty-rate-limit";
import { EmptyUsage } from "./empty-usage";
import { PromptMetadata } from "./prompt-metadata";
import type { RateLimit } from "./rate-limit";
import type { Usage } from "./usage";

/**
 * Models common AI provider metadata returned in an AI response.
 */
export class ChatResponseMetadata
	extends AbstractResponseMetadata
	implements ResponseMetadata
{
	protected _id: string = ""; // Set to blank to preserve backward compat with previous interface default methods

	protected _model: string = "";

	protected _rateLimit: RateLimit = new EmptyRateLimit();

	protected _usage: Usage = new EmptyUsage();

	protected _promptMetadata: PromptMetadata = PromptMetadata.empty();

	/**
	 * Create a new Builder instance.
	 *
	 * @returns a new Builder instance
	 */
	static builder() {
		return new ChatResponseMetadata.Builder();
	}

	/**
	 * A unique identifier for the chat completion operation.
	 *
	 * @returns unique operation identifier
	 */
	get id(): string {
		return this._id;
	}

	/**
	 * The model that handled the request.
	 *
	 * @returns the model that handled the request
	 */
	get model(): string {
		return this._model;
	}

	/**
	 * Returns AI provider specific metadata on rate limits.
	 *
	 * @returns AI provider specific metadata on rate limits
	 * @see RateLimit
	 */
	get rateLimit(): RateLimit {
		return this._rateLimit;
	}

	/**
	 * Returns AI provider specific metadata on API usage.
	 *
	 * @returns AI provider specific metadata on API usage
	 * @see Usage
	 */
	get usage(): Usage {
		return this._usage;
	}

	/**
	 * Returns the prompt metadata gathered by the AI during request processing.
	 *
	 * @returns the prompt metadata
	 */
	get promptMetadata(): PromptMetadata {
		return this._promptMetadata;
	}

	public static Builder = class ChatResponseMetadataBuilder {
		readonly #chatResponseMetadata: ChatResponseMetadata;

		/**
		 * Create a new Builder instance.
		 */
		constructor() {
			this.#chatResponseMetadata = new ChatResponseMetadata();
		}

		/**
		 * Add metadata to the response metadata.
		 *
		 * @param metadata - the metadata map to copy
		 * @returns this builder for method chaining
		 */
		metadata(metadata: Record<string, unknown>): this {
			for (const [key, value] of Object.entries(metadata)) {
				this.#chatResponseMetadata.map.set(key, value);
			}
			return this;
		}

		/**
		 * Add a key-value pair to the metadata.
		 *
		 * @param key - the metadata key (must not be null)
		 * @param value - the metadata value (null values are ignored)
		 * @returns this builder for method chaining
		 * @throws {Error} if key is null
		 */
		keyValue(key: string, value: unknown): this {
			if (key === null) {
				throw new Error("Key must not be null");
			}
			if (value !== null && value !== undefined) {
				this.#chatResponseMetadata.map.set(key, value);
			}
			console.log(`Ignore null value for key [${key}]`);
			return this;
		}

		/**
		 * Set the response ID.
		 *
		 * @param id - the response ID
		 * @returns this builder for method chaining
		 */
		id(id: string): this {
			this.#chatResponseMetadata._id = id;
			return this;
		}

		/**
		 * Set the model name.
		 *
		 * @param model - the model name
		 * @returns this builder for method chaining
		 */
		model(model: string): this {
			this.#chatResponseMetadata._model = model;
			return this;
		}

		/**
		 * Set the rate limit information.
		 *
		 * @param rateLimit - the rate limit information
		 * @returns this builder for method chaining
		 */
		rateLimit(rateLimit: RateLimit): this {
			this.#chatResponseMetadata._rateLimit = rateLimit;
			return this;
		}

		/**
		 * Set the token usage information.
		 *
		 * @param usage - the usage information
		 * @returns this builder for method chaining
		 */
		usage(usage: Usage): this {
			this.#chatResponseMetadata._usage = usage;
			return this;
		}

		/**
		 * Set the prompt metadata.
		 *
		 * @param promptMetadata - the prompt metadata
		 * @returns this builder for method chaining
		 */
		promptMetadata(promptMetadata: PromptMetadata): this {
			this.#chatResponseMetadata._promptMetadata = promptMetadata;
			return this;
		}

		/**
		 * Build the ChatResponseMetadata instance.
		 *
		 * @returns the built ChatResponseMetadata instance
		 */
		build(): ChatResponseMetadata {
			return this.#chatResponseMetadata;
		}
	};
}
