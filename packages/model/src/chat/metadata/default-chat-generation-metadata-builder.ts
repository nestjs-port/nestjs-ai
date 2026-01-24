import type {
	ChatGenerationMetadata,
	ChatGenerationMetadataBuilder,
} from "./chat-generation-metadata.interface";
import { DefaultChatGenerationMetadata } from "./chat-generation-metadata.interface";

/**
 * Default implementation of {@link ChatGenerationMetadataBuilder}.
 */
export class DefaultChatGenerationMetadataBuilder
	implements ChatGenerationMetadataBuilder
{
	private _finishReason: string | null = null;
	private readonly _metadata: Record<string, unknown> = {};
	private readonly _contentFilters: string[] = [];

	/**
	 * Set the reason this choice completed for the generation.
	 *
	 * @param finishReason - the finish reason
	 * @returns this builder for method chaining
	 */
	finishReason(finishReason: string): this {
		this._finishReason = finishReason;
		return this;
	}

	/**
	 * Add metadata to the Generation result.
	 *
	 * @typeParam T - Type of the metadata value
	 * @param key - the metadata key
	 * @param value - the metadata value
	 * @returns this builder for method chaining
	 */
	metadata<T>(key: string, value: T): this;
	/**
	 * Add metadata to the Generation result.
	 *
	 * @param metadata - the metadata map
	 * @returns this builder for method chaining
	 */
	metadata(metadata: Record<string, unknown>): this;
	metadata<T>(
		keyOrMetadata: string | Record<string, unknown>,
		value?: T,
	): this {
		if (typeof keyOrMetadata === "string" && value !== undefined) {
			this._metadata[keyOrMetadata] = value;
		} else if (typeof keyOrMetadata === "object") {
			Object.assign(this._metadata, keyOrMetadata);
		}
		return this;
	}

	/**
	 * Add content filter to the Generation result.
	 *
	 * @param contentFilter - the content filter
	 * @returns this builder for method chaining
	 */
	contentFilter(contentFilter: string): this {
		this._contentFilters.push(contentFilter);
		return this;
	}

	/**
	 * Add content filters to the Generation result.
	 *
	 * @param contentFilters - the content filters
	 * @returns this builder for method chaining
	 */
	contentFilters(contentFilters: string[]): this {
		this._contentFilters.push(...contentFilters);
		return this;
	}

	/**
	 * Build the Generation metadata.
	 *
	 * @returns the built ChatGenerationMetadata instance
	 */
	build(): ChatGenerationMetadata {
		return new DefaultChatGenerationMetadata({
			metadata: this._metadata,
			finishReason: this._finishReason,
			contentFilters: this._contentFilters,
		});
	}
}
