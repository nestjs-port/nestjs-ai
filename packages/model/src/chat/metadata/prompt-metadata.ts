import assert from "node:assert/strict";

/**
 * Abstract Data Type (ADT) modeling filter metadata for all prompts sent during an AI
 * request.
 */
export abstract class PromptFilterMetadata {
	/**
	 * Factory method used to construct a new {@link PromptFilterMetadata} with the
	 * given prompt index and content filter metadata.
	 *
	 * @param promptIndex - index of the prompt filter metadata contained in the AI
	 * response
	 * @param contentFilterMetadata - underlying AI provider metadata for filtering
	 * applied to prompt content
	 * @returns a new instance of {@link PromptFilterMetadata} with the given prompt
	 * index and content filter metadata
	 */
	static from(
		promptIndex: number,
		contentFilterMetadata: unknown,
	): PromptFilterMetadata {
		return new (class extends PromptFilterMetadata {
			get promptIndex(): number {
				return promptIndex;
			}

			getContentFilterMetadata<T>(): T {
				return contentFilterMetadata as T;
			}
		})();
	}

	/**
	 * Index of the prompt filter metadata contained in the AI response.
	 *
	 * @returns the index of the prompt filter metadata contained in the AI response
	 */
	abstract get promptIndex(): number;

	/**
	 * Returns the underlying AI provider metadata for filtering applied to prompt
	 * content.
	 *
	 * @typeParam T - Type used to cast the filtered content metadata into the
	 * AI provider-specific type
	 * @returns the underlying AI provider metadata for filtering applied to prompt
	 * content
	 */
	abstract getContentFilterMetadata<T>(): T;
}

/**
 * Abstract Data Type (ADT) modeling metadata gathered by the AI during request
 * processing.
 */
export abstract class PromptMetadata implements Iterable<PromptFilterMetadata> {
	/**
	 * Factory method used to create empty {@link PromptMetadata} when the information is
	 * not supplied by the AI provider.
	 *
	 * @returns empty {@link PromptMetadata}
	 */
	static empty(): PromptMetadata {
		return PromptMetadata.of();
	}

	/**
	 * Factory method used to create a new {@link PromptMetadata} composed of an array of
	 * {@link PromptFilterMetadata}.
	 *
	 * @param array - array of {@link PromptFilterMetadata} used to compose the
	 * {@link PromptMetadata}
	 * @returns a new {@link PromptMetadata} composed of an array of
	 * {@link PromptFilterMetadata}
	 */
	static of(...array: PromptFilterMetadata[]): PromptMetadata;
	/**
	 * Factory method used to create a new {@link PromptMetadata} composed of an
	 * {@link Iterable} of {@link PromptFilterMetadata}.
	 *
	 * @param iterable - {@link Iterable} of {@link PromptFilterMetadata} used to compose
	 * the {@link PromptMetadata}
	 * @returns a new {@link PromptMetadata} composed of an {@link Iterable} of
	 * {@link PromptFilterMetadata}
	 */
	static of(iterable: Iterable<PromptFilterMetadata>): PromptMetadata;
	static of(
		first?: PromptFilterMetadata | Iterable<PromptFilterMetadata>,
		...rest: PromptFilterMetadata[]
	): PromptMetadata {
		if (first === undefined && rest.length === 0) {
			return new (class extends PromptMetadata {
				[Symbol.iterator](): Iterator<PromptFilterMetadata> {
					return [][Symbol.iterator]();
				}
			})();
		}
		// If we have rest parameters, treat as array (rest parameters)
		if (rest.length > 0) {
			const array = [first as PromptFilterMetadata, ...rest];
			return new (class extends PromptMetadata {
				[Symbol.iterator](): Iterator<PromptFilterMetadata> {
					return array[Symbol.iterator]();
				}
			})();
		}
		// If first is an array, treat as array
		if (Array.isArray(first)) {
			return new (class extends PromptMetadata {
				[Symbol.iterator](): Iterator<PromptFilterMetadata> {
					return first[Symbol.iterator]();
				}
			})();
		}
		// Otherwise treat as Iterable
		assert(first, "An Iterable of PromptFilterMetadata must not be null");
		const iterable = first as Iterable<PromptFilterMetadata>;
		return new (class extends PromptMetadata {
			[Symbol.iterator](): Iterator<PromptFilterMetadata> {
				return iterable[Symbol.iterator]();
			}
		})();
	}

	/**
	 * Returns an optional {@link PromptFilterMetadata} at the given index.
	 *
	 * @param promptIndex - index of the {@link PromptFilterMetadata} contained in this
	 * {@link PromptMetadata}
	 * @returns optional {@link PromptFilterMetadata} at the given index
	 * @throws {Error} if the prompt index is less than 0
	 */
	findByPromptIndex(promptIndex: number): PromptFilterMetadata | null {
		assert(
			promptIndex > -1,
			`Prompt index [${promptIndex}] must be greater than equal to 0`,
		);

		for (const promptFilterMetadata of this) {
			if (promptFilterMetadata.promptIndex === promptIndex) {
				return promptFilterMetadata;
			}
		}

		return null;
	}

	abstract [Symbol.iterator](): Iterator<PromptFilterMetadata>;
}
