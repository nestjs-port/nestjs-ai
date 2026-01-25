/**
 * OpenAI Chat Options JSON Schema
 * Converted from OpenAiChatOptions.java
 */

/**
 * Response format type
 */
export type ResponseFormatType = "text" | "json_object" | "json_schema";

/**
 * JSON Schema for response format
 */
export interface JsonSchema {
	name?: string;
	schema?: Record<string, unknown>;
	strict?: boolean;
}

/**
 * Response format configuration
 */
export interface ResponseFormat {
	type?: ResponseFormatType;
	jsonSchema?: JsonSchema;
}

/**
 * Stream options for streaming responses
 */
export interface StreamOptions {
	includeUsage?: boolean;
}

/**
 * Audio voice type
 */
export type AudioVoice =
	| "alloy"
	| "ash"
	| "ballad"
	| "coral"
	| "echo"
	| "fable"
	| "onyx"
	| "nova"
	| "sage"
	| "shimmer";

/**
 * Audio response format
 */
export type AudioResponseFormat = "mp3" | "flac" | "opus" | "pcm16" | "wav";

/**
 * Audio parameters for audio generation
 */
export interface AudioParameters {
	voice?: AudioVoice;
	format?: AudioResponseFormat;
}

/**
 * Search context size for web search
 */
export type SearchContextSize = "low" | "medium" | "high";

/**
 * Approximate location details
 */
export interface ApproximateLocation {
	city?: string;
	country?: string;
	region?: string;
	timezone?: string;
}

/**
 * User location for web search
 */
export interface UserLocation {
	type?: string;
	approximate?: ApproximateLocation;
}

/**
 * Web search options
 */
export interface WebSearchOptions {
	searchContextSize?: SearchContextSize;
	userLocation?: UserLocation;
}

/**
 * Function tool type
 */
export type FunctionToolType = "function";

/**
 * Function definition for tool calling
 */
export interface FunctionDefinition {
	description?: string;
	name?: string;
	parameters?: Record<string, unknown>;
	strict?: boolean;
}

/**
 * Function tool definition
 */
export interface FunctionTool {
	type?: FunctionToolType;
	function?: FunctionDefinition;
}

/**
 * Tool choice can be a string ("none", "auto") or an object specifying a function
 */
export type ToolChoice =
	| "none"
	| "auto"
	| {
			type: "function";
			function: {
				name: string;
			};
	  };

/**
 * Service tier for processing requests
 */
export type ServiceTier = "auto" | "scale";

/**
 * Reasoning effort for reasoning models
 */
export type ReasoningEffort = "low" | "medium" | "high";

/**
 * Verbosity level
 */
export type Verbosity = "low" | "medium" | "high";

/**
 * OpenAI Chat Options JSON Schema
 * Based on OpenAiChatOptions.java
 */
export interface OpenAiChatOptions {
	/**
	 * ID of the model to use.
	 */
	model?: string | null;

	/**
	 * Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing
	 * frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
	 */
	frequencyPenalty?: number | null;

	/**
	 * Modify the likelihood of specified tokens appearing in the completion. Accepts a JSON object
	 * that maps tokens (specified by their token ID in the tokenizer) to an associated bias value from -100 to 100.
	 */
	logitBias?: Record<string, number> | null;

	/**
	 * Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities
	 * of each output token returned in the 'content' of 'message'.
	 */
	logprobs?: boolean | null;

	/**
	 * An integer between 0 and 5 specifying the number of most likely tokens to return at each token position,
	 * each with an associated log probability. 'logprobs' must be set to 'true' if this parameter is used.
	 */
	topLogprobs?: number | null;

	/**
	 * The maximum number of tokens to generate in the chat completion.
	 * The total length of input tokens and generated tokens is limited by the model's context length.
	 *
	 * Use for non-reasoning models (e.g., gpt-4o, gpt-3.5-turbo)
	 * Cannot be used with reasoning models (e.g., o1, o3, o4-mini series)
	 *
	 * Mutual exclusivity: This parameter cannot be used together with maxCompletionTokens.
	 */
	maxTokens?: number | null;

	/**
	 * An upper bound for the number of tokens that can be generated for a completion,
	 * including visible output tokens and reasoning tokens.
	 *
	 * Required for reasoning models (e.g., o1, o3, o4-mini series)
	 * Cannot be used with non-reasoning models (e.g., gpt-4o, gpt-3.5-turbo)
	 *
	 * Mutual exclusivity: This parameter cannot be used together with maxTokens.
	 */
	maxCompletionTokens?: number | null;

	/**
	 * How many chat completion choices to generate for each input message. Note that you will be charged based
	 * on the number of generated tokens across all of the choices. Keep n as 1 to minimize costs.
	 */
	n?: number | null;

	/**
	 * Output types that you would like the model to generate for this request.
	 * Most models are capable of generating text, which is the default.
	 * The gpt-4o-audio-preview model can also be used to generate audio.
	 * To request that this model generate both text and audio responses,
	 * you can use: ["text", "audio"].
	 * Note that the audio modality is only available for the gpt-4o-audio-preview model
	 * and is not supported for streaming completions.
	 */
	modalities?: string[] | null;

	/**
	 * Audio parameters for the audio generation. Required when audio output is requested with
	 * modalities: ["audio"]
	 * Note: that the audio modality is only available for the gpt-4o-audio-preview model
	 * and is not supported for streaming completions.
	 */
	audio?: AudioParameters | null;

	/**
	 * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they
	 * appear in the text so far, increasing the model's likelihood to talk about new topics.
	 */
	presencePenalty?: number | null;

	/**
	 * An object specifying the format that the model must output. Setting to { "type":
	 * "json_object" } enables JSON mode, which guarantees the message the model generates is valid JSON.
	 */
	responseFormat?: ResponseFormat | null;

	/**
	 * Options for streaming response. Included in the API only if streaming-mode completion is requested.
	 */
	streamOptions?: StreamOptions | null;

	/**
	 * This feature is in Beta. If specified, our system will make a best effort to sample
	 * deterministically, such that repeated requests with the same seed and parameters should return the same result.
	 * Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor
	 * changes in the backend.
	 */
	seed?: number | null;

	/**
	 * Up to 4 sequences where the API will stop generating further tokens.
	 */
	stop?: string[] | null;

	/**
	 * What sampling temperature to use, between 0 and 1. Higher values like 0.8 will make the output
	 * more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend
	 * altering this or top_p but not both.
	 */
	temperature?: number | null;

	/**
	 * An alternative to sampling with temperature, called nucleus sampling, where the model considers the
	 * results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10%
	 * probability mass are considered. We generally recommend altering this or temperature but not both.
	 */
	topP?: number | null;

	/**
	 * A list of tools the model may call. Currently, only functions are supported as a tool. Use this to
	 * provide a list of functions the model may generate JSON inputs for.
	 */
	tools?: FunctionTool[] | null;

	/**
	 * Controls which (if any) function is called by the model. none means the model will not call a
	 * function and instead generates a message. auto means the model can pick between generating a message or calling a
	 * function. Specifying a particular function via {"type: "function", "function": {"name": "my_function"}} forces
	 * the model to call that function. none is the default when no functions are present. auto is the default if
	 * functions are present.
	 */
	toolChoice?: ToolChoice | null;

	/**
	 * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.
	 */
	user?: string | null;

	/**
	 * Whether to enable parallel function calling during tool use.
	 * Defaults to true.
	 */
	parallelToolCalls?: boolean | null;

	/**
	 * Whether to store the output of this chat completion request for use in our model distillation or evals products.
	 */
	store?: boolean | null;

	/**
	 * Developer-defined tags and values used for filtering completions in the dashboard.
	 */
	metadata?: Record<string, string> | null;

	/**
	 * Constrains effort on reasoning for reasoning models. Currently supported values are low, medium, and high.
	 * Reducing reasoning effort can result in faster responses and fewer tokens used on reasoning in a response.
	 * Optional. Defaults to medium.
	 * Only for 'o1' models.
	 */
	reasoningEffort?: ReasoningEffort | null;

	/**
	 * Constrains the verbosity of the model's response. Lower values will result in more concise responses, while higher values will result in more verbose responses.
	 * Currently supported values are low, medium, and high.
	 * If specified, the model will use web search to find relevant information to answer the user's question.
	 */
	verbosity?: Verbosity | null;

	/**
	 * This tool searches the web for relevant results to use in a response.
	 */
	webSearchOptions?: WebSearchOptions | null;

	/**
	 * Specifies the processing type used for serving the request.
	 */
	serviceTier?: ServiceTier | null;

	/**
	 * A cache key used by OpenAI to optimize cache hit rates for similar requests.
	 * Improves latency and reduces costs. Replaces the deprecated user field for caching purposes.
	 */
	promptCacheKey?: string | null;

	/**
	 * A stable identifier to help OpenAI detect users violating usage policies.
	 * Should be a hashed value (e.g., hashed username or email). Replaces the deprecated user field for safety tracking.
	 */
	safetyIdentifier?: string | null;

	/**
	 * Additional parameters to pass to OpenAI-compatible servers. Accepts any key-value pairs
	 * that will be included at the top level of the JSON request. Intended for use with
	 * vLLM, Ollama, and other OpenAI-compatible servers that support parameters beyond the
	 * standard OpenAI API (e.g., top_k, repetition_penalty). The official
	 * OpenAI API ignores unknown parameters.
	 */
	extraBody?: Record<string, unknown> | null;
}
