import assert from "node:assert/strict";
import type { ChatOptions } from "../../chat";
import type { ToolCallback } from "../../tool";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";

export class DefaultToolCallingChatOptions implements ToolCallingChatOptions {
	readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

	private _toolCallbacks: ToolCallback[] = [];
	private _toolNames: Set<string> = new Set();
	private _toolContext: Record<string, unknown> = {};
	private _internalToolExecutionEnabled: boolean | null = null;
	private _model: string | null = null;
	private _frequencyPenalty: number | null = null;
	private _maxTokens: number | null = null;
	private _presencePenalty: number | null = null;
	private _stopSequences: string[] | null = null;
	private _temperature: number | null = null;
	private _topK: number | null = null;
	private _topP: number | null = null;

	get toolCallbacks(): ToolCallback[] {
		return [...this._toolCallbacks];
	}

	set toolCallbacks(toolCallbacks: ToolCallback[]) {
		assert(toolCallbacks, "toolCallbacks cannot be null");
		this._toolCallbacks = [...toolCallbacks];
	}

	get toolNames(): Set<string> {
		return new Set(this._toolNames);
	}

	set toolNames(toolNames: Set<string>) {
		assert(toolNames, "toolNames cannot be null");
		this._toolNames = new Set(toolNames);
	}

	get toolContext(): Record<string, unknown> {
		return { ...this._toolContext };
	}

	set toolContext(toolContext: Record<string, unknown>) {
		assert(toolContext, "toolContext cannot be null");
		this._toolContext = { ...toolContext };
	}

	get internalToolExecutionEnabled(): boolean | null {
		return this._internalToolExecutionEnabled;
	}

	set internalToolExecutionEnabled(internalToolExecutionEnabled:
		| boolean
		| null,) {
		this._internalToolExecutionEnabled = internalToolExecutionEnabled;
	}

	get model(): string | null {
		return this._model;
	}

	set model(model: string | null) {
		this._model = model;
	}

	get frequencyPenalty(): number | null {
		return this._frequencyPenalty;
	}

	set frequencyPenalty(frequencyPenalty: number | null) {
		this._frequencyPenalty = frequencyPenalty;
	}

	get maxTokens(): number | null {
		return this._maxTokens;
	}

	set maxTokens(maxTokens: number | null) {
		this._maxTokens = maxTokens;
	}

	get presencePenalty(): number | null {
		return this._presencePenalty;
	}

	set presencePenalty(presencePenalty: number | null) {
		this._presencePenalty = presencePenalty;
	}

	get stopSequences(): string[] | null {
		return this._stopSequences;
	}

	set stopSequences(stopSequences: string[] | null) {
		this._stopSequences = stopSequences;
	}

	get temperature(): number | null {
		return this._temperature;
	}

	set temperature(temperature: number | null) {
		this._temperature = temperature;
	}

	get topK(): number | null {
		return this._topK;
	}

	set topK(topK: number | null) {
		this._topK = topK;
	}

	get topP(): number | null {
		return this._topP;
	}

	set topP(topP: number | null) {
		this._topP = topP;
	}

	copy(): ChatOptions {
		const options = new DefaultToolCallingChatOptions();
		options.toolCallbacks = this.toolCallbacks;
		options.toolNames = this.toolNames;
		options.toolContext = this.toolContext;
		options.internalToolExecutionEnabled = this.internalToolExecutionEnabled;
		options.model = this.model;
		options.frequencyPenalty = this.frequencyPenalty;
		options.maxTokens = this.maxTokens;
		options.presencePenalty = this.presencePenalty;
		options.stopSequences = this.stopSequences;
		options.temperature = this.temperature;
		options.topK = this.topK;
		options.topP = this.topP;
		return options;
	}

	static builder(): DefaultToolCallingChatOptionsBuilder {
		return new DefaultToolCallingChatOptionsBuilder();
	}
}

export class DefaultToolCallingChatOptionsBuilder
	implements ToolCallingChatOptions.Builder
{
	private readonly _options = new DefaultToolCallingChatOptions();

	toolCallbacks(...toolCallbacks: ToolCallback[] | [ToolCallback[]]): this {
		if (toolCallbacks.length === 1 && Array.isArray(toolCallbacks[0])) {
			this._options.toolCallbacks = toolCallbacks[0] as ToolCallback[];
		} else {
			this._options.toolCallbacks = toolCallbacks as ToolCallback[];
		}
		return this;
	}

	toolNames(...toolNames: string[] | [Set<string>]): this {
		if (toolNames.length === 1 && toolNames[0] instanceof Set) {
			this._options.toolNames = toolNames[0] as Set<string>;
		} else {
			this._options.toolNames = new Set(toolNames as string[]);
		}
		return this;
	}

	internalToolExecutionEnabled(
		internalToolExecutionEnabled: boolean | null,
	): this {
		this._options.internalToolExecutionEnabled = internalToolExecutionEnabled;
		return this;
	}

	toolContext(context: Record<string, unknown>): this;
	toolContext(key: string, value: unknown): this;
	toolContext(
		keyOrContext: string | Record<string, unknown>,
		value?: unknown,
	): this {
		if (typeof keyOrContext === "string") {
			assert(keyOrContext, "key cannot be null");
			assert(value != null, "value cannot be null");
			const updatedContext = { ...this._options.toolContext };
			updatedContext[keyOrContext] = value;
			this._options.toolContext = updatedContext;
		} else {
			this._options.toolContext = keyOrContext;
		}
		return this;
	}

	model(model: string | null): this {
		this._options.model = model;
		return this;
	}

	frequencyPenalty(frequencyPenalty: number | null): this {
		this._options.frequencyPenalty = frequencyPenalty;
		return this;
	}

	maxTokens(maxTokens: number | null): this {
		this._options.maxTokens = maxTokens;
		return this;
	}

	presencePenalty(presencePenalty: number | null): this {
		this._options.presencePenalty = presencePenalty;
		return this;
	}

	stopSequences(stopSequences: string[] | null): this {
		this._options.stopSequences = stopSequences;
		return this;
	}

	temperature(temperature: number | null): this {
		this._options.temperature = temperature;
		return this;
	}

	topK(topK: number | null): this {
		this._options.topK = topK;
		return this;
	}

	topP(topP: number | null): this {
		this._options.topP = topP;
		return this;
	}

	build(): ToolCallingChatOptions {
		return this._options;
	}
}
