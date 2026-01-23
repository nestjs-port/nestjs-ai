import assert from "node:assert/strict";
import type { ModelResponse } from "../../model";
import type { ToolCall } from "../messages";
import { ChatResponseMetadata } from "../metadata";
import type { Generation } from "./generation";

/**
 * Properties for creating a ChatResponse instance.
 */
export interface ChatResponseProps {
	generations: Generation[];
	chatResponseMetadata?: ChatResponseMetadata;
}

/**
 * The ChatResponse class represents the response from an AI chat model.
 * It contains one or more generations and metadata about the response.
 */
export class ChatResponse implements ModelResponse<Generation> {
	private readonly _generations: Generation[];
	private readonly _chatResponseMetadata: ChatResponseMetadata;

	constructor(props: ChatResponseProps) {
		assert(props.generations, "Generations must not be null");
		assert(props.generations.length > 0, "Generations must not be empty");
		this._generations = props.generations;
		this._chatResponseMetadata =
			props.chatResponseMetadata ?? ChatResponseMetadata.EMPTY;
	}

	/**
	 * Get the first generation result (ModelResponse interface).
	 */
	get result(): Generation | null {
		return this._generations.length > 0 ? this._generations[0] : null;
	}

	/**
	 * Get all generation results (ModelResponse interface).
	 */
	get results(): Generation[] {
		return this._generations;
	}

	/**
	 * Get the response metadata (ModelResponse interface).
	 */
	get metadata(): ChatResponseMetadata {
		return this._chatResponseMetadata;
	}

	/**
	 * Get the first generation result (Spring AI compatible method).
	 */
	getResult(): Generation | null {
		return this.result;
	}

	/**
	 * Get all generation results (Spring AI compatible method).
	 */
	getResults(): Generation[] {
		return this.results;
	}

	/**
	 * Get the response metadata (Spring AI compatible method).
	 */
	getMetadata(): ChatResponseMetadata {
		return this.metadata;
	}

	/**
	 * Check if any generation has tool calls.
	 */
	hasToolCalls(): boolean {
		return this._generations.some((gen) => gen.output.hasToolCalls());
	}

	/**
	 * Get all tool calls from all generations.
	 */
	getToolCalls(): ToolCall[] {
		return this._generations.flatMap((gen) => gen.output.toolCalls);
	}

	/**
	 * Check if any generation has one of the specified finish reasons.
	 */
	hasFinishReasons(...finishReasons: string[]): boolean {
		const finishReasonSet = new Set(finishReasons);
		return this._generations.some((gen) => {
			const reason = gen.metadata.finishReason;
			return reason !== null && finishReasonSet.has(reason);
		});
	}

	/**
	 * Create a new ChatResponseBuilder.
	 */
	static builder(): ChatResponseBuilder {
		return new ChatResponseBuilder();
	}

	/**
	 * Create a ChatResponse from a single generation.
	 */
	static from(generation: Generation): ChatResponse {
		return new ChatResponse({ generations: [generation] });
	}

	/**
	 * Create a ChatResponse from generations.
	 */
	static of(...generations: Generation[]): ChatResponse {
		return new ChatResponse({ generations });
	}
}

/**
 * Builder for creating ChatResponse instances.
 */
export class ChatResponseBuilder {
	private _generations: Generation[] = [];
	private _metadata: ChatResponseMetadata = ChatResponseMetadata.EMPTY;

	/**
	 * Add a generation.
	 */
	generation(generation: Generation): this {
		this._generations.push(generation);
		return this;
	}

	/**
	 * Set all generations.
	 */
	generations(generations: Generation[]): this {
		this._generations = generations;
		return this;
	}

	/**
	 * Set the response metadata.
	 */
	chatResponseMetadata(metadata: ChatResponseMetadata): this {
		this._metadata = metadata;
		return this;
	}

	/**
	 * Build the ChatResponse instance.
	 */
	build(): ChatResponse {
		return new ChatResponse({
			generations: this._generations,
			chatResponseMetadata: this._metadata,
		});
	}
}
