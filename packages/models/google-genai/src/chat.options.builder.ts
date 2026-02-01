import type { ToolCallback } from "@nestjs-ai/model";
import { GoogleGenAiChatOptions, type SafetySetting } from "./chat.options";

/**
 * Builder pattern for GoogleGenAiChatOptions.
 * Provides fluent API for constructing options with validation.
 */
export class GoogleGenAiChatOptionsBuilder {
	private _model: string | undefined;

	private _temperature: number | undefined;

	private _topK: number | undefined;

	private _topP: number | undefined;

	private _maxOutputTokens: number | undefined;

	private _stopSequences: string[] | undefined;

	private _responseMimeType: string | undefined;

	private _responseSchema: string | undefined;

	private _locale: string | undefined;

	private _thinkingLevel: "LOW" | "HIGH" | "UNSPECIFIED" | undefined;

	private _thinkingBudget: number | undefined;

	private _includeThoughts: boolean | undefined;

	private _cachedContentName: string | undefined;

	private _useCachedContent: boolean | undefined;

	private _autoCacheThreshold: number | undefined;

	private _autoCacheTtl: string | undefined;

	private _includeExtendedUsageMetadata: boolean | undefined;

	private _googleSearchRetrieval: boolean | undefined;

	private _toolCallbacks: ToolCallback[] = [];

	private _toolNames: Set<string> | undefined;

	private _internalToolExecutionEnabled: boolean | undefined;

	private _toolContext: Map<string, unknown> | undefined;

	private _safetySettings: SafetySetting[] | undefined;

	/**
	 * Set the model identifier.
	 */
	model(model: string): this {
		this._model = model;
		return this;
	}

	/**
	 * Set the temperature for generation.
	 */
	temperature(temperature: number): this {
		this._temperature = temperature;
		return this;
	}

	/**
	 * Set the top-K sampling parameter.
	 */
	topK(topK: number): this {
		this._topK = topK;
		return this;
	}

	/**
	 * Set the top-P (nucleus) sampling parameter.
	 */
	topP(topP: number): this {
		this._topP = topP;
		return this;
	}

	/**
	 * Set maximum output tokens.
	 */
	maxOutputTokens(maxOutputTokens: number): this {
		this._maxOutputTokens = maxOutputTokens;
		return this;
	}

	/**
	 * Add stop sequences.
	 */
	stopSequences(...stopSequences: string[]): this {
		this._stopSequences = [...(this._stopSequences ?? []), ...stopSequences];
		return this;
	}

	/**
	 * Set response MIME type.
	 */
	responseMimeType(responseMimeType: string): this {
		this._responseMimeType = responseMimeType;
		return this;
	}

	/**
	 * Set response JSON Schema.
	 */
	responseSchema(responseSchema: string): this {
		this._responseSchema = responseSchema;
		return this;
	}

	/**
	 * Set locale for generation.
	 */
	locale(locale: string): this {
		this._locale = locale;
		return this;
	}

	/**
	 * Set thinking level.
	 */
	thinkingLevel(thinkingLevel: "LOW" | "HIGH" | "UNSPECIFIED"): this {
		if (thinkingLevel !== undefined && this._thinkingBudget !== undefined) {
			throw new Error("Cannot set both thinkingLevel and thinkingBudget");
		}
		this._thinkingLevel = thinkingLevel;
		return this;
	}

	/**
	 * Set thinking budget.
	 */
	thinkingBudget(thinkingBudget: number): this {
		if (thinkingBudget !== undefined && this._thinkingLevel !== undefined) {
			throw new Error("Cannot set both thinkingLevel and thinkingBudget");
		}
		this._thinkingBudget = thinkingBudget;
		return this;
	}

	/**
	 * Set whether to include thoughts in response.
	 */
	includeThoughts(includeThoughts: boolean): this {
		this._includeThoughts = includeThoughts;
		return this;
	}

	/**
	 * Set cached content name.
	 */
	cachedContentName(cachedContentName: string): this {
		this._cachedContentName = cachedContentName;
		return this;
	}

	/**
	 * Enable automatic cached content usage.
	 */
	useCachedContent(useCachedContent: boolean): this {
		this._useCachedContent = useCachedContent;
		return this;
	}

	/**
	 * Set auto-cache threshold.
	 */
	autoCacheThreshold(autoCacheThreshold: number): this {
		this._autoCacheThreshold = autoCacheThreshold;
		return this;
	}

	/**
	 * Set auto-cache TTL.
	 */
	autoCacheTtl(autoCacheTtl: string): this {
		this._autoCacheTtl = autoCacheTtl;
		return this;
	}

	/**
	 * Set whether to include extended usage metadata.
	 */
	includeExtendedUsageMetadata(includeExtendedUsageMetadata: boolean): this {
		this._includeExtendedUsageMetadata = includeExtendedUsageMetadata;
		return this;
	}

	/**
	 * Enable Google Search retrieval.
	 */
	googleSearchRetrieval(googleSearchRetrieval: boolean): this {
		this._googleSearchRetrieval = googleSearchRetrieval;
		return this;
	}

	/**
	 * Add tool callback.
	 */
	withToolCallback(...toolCallback: ToolCallback[]): this {
		this._toolCallbacks = [...this._toolCallbacks, ...toolCallback];
		return this;
	}

	/**
	 * Set restricted tool names.
	 */
	toolNames(toolNames: Set<string>): this {
		this._toolNames = toolNames;
		return this;
	}

	/**
	 * Enable automatic tool execution.
	 */
	internalToolExecutionEnabled(internalToolExecutionEnabled: boolean): this {
		this._internalToolExecutionEnabled = internalToolExecutionEnabled;
		return this;
	}

	/**
	 * Set tool execution context.
	 */
	toolContext(toolContext: Map<string, unknown>): this {
		this._toolContext = toolContext;
		return this;
	}

	/**
	 * Set safety settings.
	 */
	safetySettings(safetySettings: SafetySetting[]): this {
		this._safetySettings = safetySettings;
		return this;
	}

	/**
	 * Build the GoogleGenAiChatOptions instance.
	 */
	build(): GoogleGenAiChatOptions {
		return new GoogleGenAiChatOptions({
			model: this._model,
			temperature: this._temperature,
			topK: this._topK,
			topP: this._topP,
			maxOutputTokens: this._maxOutputTokens,
			stopSequences: this._stopSequences,
			responseMimeType: this._responseMimeType,
			responseSchema: this._responseSchema,
			locale: this._locale,
			thinkingLevel: this._thinkingLevel,
			thinkingBudget: this._thinkingBudget,
			includeThoughts: this._includeThoughts,
			cachedContentName: this._cachedContentName,
			useCachedContent: this._useCachedContent,
			autoCacheThreshold: this._autoCacheThreshold,
			autoCacheTtl: this._autoCacheTtl,
			includeExtendedUsageMetadata: this._includeExtendedUsageMetadata,
			googleSearchRetrieval: this._googleSearchRetrieval,
			toolCallbacks: this._toolCallbacks,
			toolNames: this._toolNames,
			internalToolExecutionEnabled: this._internalToolExecutionEnabled,
			toolContext: this._toolContext,
			safetySettings: this._safetySettings,
		});
	}
}
