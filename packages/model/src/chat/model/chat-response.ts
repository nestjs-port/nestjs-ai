import assert from "node:assert/strict";
import type { ModelResponse } from "../../model";
import { ChatResponseMetadata } from "../metadata";
import type { Generation } from "./generation";

export interface ChatResponseProps {
	generations: Generation[];
	chatResponseMetadata?: ChatResponseMetadata;
}

/**
 * The chat completion (e.g. generation) response returned by an AI provider.
 */
export class ChatResponse implements ModelResponse<Generation> {
	/**
	 * List of generated messages returned by the AI provider.
	 */
	private readonly _generations: Generation[];
	private readonly _chatResponseMetadata: ChatResponseMetadata;

	/**
	 * Construct a new {@link ChatResponse} instance.
	 * @param props.generations - The {@link Array} of {@link Generation} returned by the AI provider.
	 * @param props.chatResponseMetadata - {@link ChatResponseMetadata} containing information about the use of the AI provider's API.
	 */
	constructor(props: ChatResponseProps) {
		assert(props.generations, "Generations must not be null");
		this._generations = props.generations;
		this._chatResponseMetadata =
			props.chatResponseMetadata ?? new ChatResponseMetadata();
	}

	/**
	 * @returns Returns the first {@link Generation} in the generations list.
	 */
	get result(): Generation | null {
		return this._generations.length > 0 ? this._generations[0] : null;
	}

	/**
	 * The {@link Array} of {@link Generation generated outputs}.
	 * It is an {@link Array} of {@link Generation generations} because the Prompt could request multiple output {@link Generation generations}.
	 * @returns The {@link Array} of {@link Generation generated outputs}.
	 */
	get results(): Generation[] {
		return this._generations;
	}

	/**
	 * @returns Returns {@link ChatResponseMetadata} containing information about the use of the AI provider's API.
	 */
	get metadata(): ChatResponseMetadata {
		return this._chatResponseMetadata;
	}

	/**
	 * Whether the model has requested the execution of a tool.
	 */
	hasToolCalls(): boolean {
		if (this._generations.length === 0) {
			return false;
		}
		return this._generations.some((gen) => gen.output.hasToolCalls());
	}

	/**
	 * Whether the model has finished with any of the given finish reasons.
	 */
	hasFinishReasons(...finishReasons: string[]): boolean {
		// Check if any argument is null (for runtime validation)
		if (finishReasons.some((reason) => reason === null)) {
			throw new Error("finishReasons cannot be null");
		}
		if (this._generations.length === 0) {
			return false;
		}
		const finishReasonSet = new Set(finishReasons);
		return this._generations.some((gen) => {
			const reason = gen.metadata.finishReason;
			return reason !== null && finishReasonSet.has(reason);
		});
	}

	static builder(): ChatResponseBuilder {
		return new ChatResponseBuilder();
	}
}

export class ChatResponseBuilder {
	private _generations: Generation[] | null = null;
	private readonly _chatResponseMetadataBuilder =
		ChatResponseMetadata.builder();

	from(other: ChatResponse): this {
		this._generations = other.results;
		return this.metadata(other.metadata);
	}

	metadata(key: string, value: unknown): this;
	metadata(metadata: ChatResponseMetadata): this;
	metadata(
		keyOrMetadata: string | ChatResponseMetadata,
		value?: unknown,
	): this {
		if (typeof keyOrMetadata === "string") {
			if (value === undefined) {
				throw new Error("value must be provided when key is a string");
			}
			this._chatResponseMetadataBuilder.keyValue(keyOrMetadata, value);
		} else {
			this._chatResponseMetadataBuilder.model(keyOrMetadata.model);
			this._chatResponseMetadataBuilder.id(keyOrMetadata.id);
			this._chatResponseMetadataBuilder.rateLimit(keyOrMetadata.rateLimit);
			this._chatResponseMetadataBuilder.usage(keyOrMetadata.usage);
			this._chatResponseMetadataBuilder.promptMetadata(
				keyOrMetadata.promptMetadata,
			);
			for (const [key, val] of keyOrMetadata.entries()) {
				this._chatResponseMetadataBuilder.keyValue(key, val);
			}
		}
		return this;
	}

	generations(generations: Generation[]): this {
		this._generations = generations;
		return this;
	}

	build(): ChatResponse {
		assert(this._generations !== null, "'generations' must not be null");
		return new ChatResponse({
			generations: this._generations,
			chatResponseMetadata: this._chatResponseMetadataBuilder.build(),
		});
	}
}
