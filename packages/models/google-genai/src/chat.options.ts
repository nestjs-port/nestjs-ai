import type { ToolCallback } from "@nestjs-ai/model";
import { type ChatOptions, DefaultChatOptions } from "@nestjs-ai/model";

export type { ChatOptions, ToolCallback };

/**
 * Configuration for safety settings.
 * Specifies the harm category and the corresponding block threshold.
 */
export interface SafetySetting {
	/**
	 * The category of harm to configure.
	 */
	readonly category:
		| "HARM_CATEGORY_HARASSMENT"
		| "HARM_CATEGORY_HATE_SPEECH"
		| "HARM_CATEGORY_SEXUALLY_EXPLICIT"
		| "HARM_CATEGORY_DANGEROUS_CONTENT"
		| "HARM_CATEGORY_CIVIC_INTEGRITY"
		| "HARM_CATEGORY_UNSPECIFIED";

	/**
	 * The threshold for blocking content.
	 */
	readonly threshold:
		| "BLOCK_NONE"
		| "BLOCK_LOW_AND_ABOVE"
		| "BLOCK_MEDIUM_AND_ABOVE"
		| "BLOCK_ONLY_HIGH"
		| "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
}

/**
 * Chat options with tool calling configuration.
 */
export interface ToolCallingChatOptions extends ChatOptions {
	/**
	 * Tool callback functions that model can call during conversation.
	 */
	readonly toolCallbacks?: ToolCallback[];

	/**
	 * Restricted set of tool names. Model will only call tools in this set.
	 */
	readonly toolNames?: Set<string>;

	/**
	 * Enable automatic tool execution by ToolCallingManager.
	 */
	readonly internalToolExecutionEnabled?: boolean;

	/**
	 * Additional context for tool execution.
	 */
	readonly toolContext?: Map<string, unknown>;
}

/**
 * Google GenAI-specific chat options.
 * Extends base ChatOptions with Google-specific features like thinking and caching.
 */
export class GoogleGenAiChatOptions
	extends DefaultChatOptions
	implements ToolCallingChatOptions
{
	/**
	 * Maximum number of tokens to generate.
	 */
	readonly maxOutputTokens?: number;

	/**
	 * MIME type of response.
	 */
	readonly responseMimeType?: string;

	/**
	 * JSON Schema for structured output.
	 */
	readonly responseSchema?: string;

	/**
	 * Locale for generation.
	 */
	readonly locale?: string;

	/**
	 * Thinking depth level.
	 */
	readonly thinkingLevel?: "LOW" | "HIGH" | "UNSPECIFIED";

	/**
	 * Maximum number of thinking tokens.
	 */
	readonly thinkingBudget?: number;

	/**
	 * Include thought process in response.
	 */
	readonly includeThoughts?: boolean;

	/**
	 * Number of candidates to generate.
	 */
	readonly candidateCount?: number;

	/**
	 * Labels for the request.
	 */
	readonly labels?: Record<string, unknown>;

	/**
	 * Name of cached content to use for this request.
	 */
	readonly cachedContentName?: string;

	/**
	 * Enable automatic cached content usage.
	 */
	readonly useCachedContent?: boolean;

	/**
	 * Token threshold for automatic caching.
	 */
	readonly autoCacheThreshold?: number;

	/**
	 * Time-to-live for auto-cached content.
	 */
	readonly autoCacheTtl?: string;

	/**
	 * Include extended usage metadata in response.
	 */
	readonly includeExtendedUsageMetadata?: boolean;

	/**
	 * Enable Google Search retrieval for responses.
	 */
	readonly googleSearchRetrieval?: boolean;

	/**
	 * Tool callback functions.
	 */
	readonly toolCallbacks?: ToolCallback[];

	/**
	 * Restricted set of tool names.
	 */
	readonly toolNames?: Set<string>;

	/**
	 * Enable automatic tool execution.
	 */
	readonly internalToolExecutionEnabled?: boolean;

	/**
	 * Additional context for tool execution.
	 */
	readonly toolContext?: Map<string, unknown>;

	/**
	 * Safety settings for the model.
	 */
	readonly safetySettings?: SafetySetting[];

	constructor(options?: Partial<GoogleGenAiChatOptions>) {
		super(options);
		if (options) {
			Object.assign(this, options);
		}
	}

	override copy(): GoogleGenAiChatOptions {
		return new GoogleGenAiChatOptions(this);
	}
}
