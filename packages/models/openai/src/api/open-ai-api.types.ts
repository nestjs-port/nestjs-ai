/**
 * OpenAI API types for Chat Completion and Embedding endpoints.
 *
 * Based on Spring AI's OpenAiApi.java
 * @see https://platform.openai.com/docs/api-reference/chat
 * @see https://platform.openai.com/docs/api-reference/embeddings
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * OpenAI Chat Completion Models.
 *
 * This enum provides a selective list of chat completion models available through the
 * OpenAI API, along with their key features and links to the official OpenAI
 * documentation for further details.
 *
 * The models are grouped by their capabilities and intended use cases. For each
 * model, a brief description is provided, highlighting its strengths, limitations,
 * and any specific features. When available, the description also includes
 * information about the model's context window, maximum output tokens, and knowledge
 * cutoff date.
 *
 * @see https://platform.openai.com/docs/models
 */
export enum ChatModel {
  // --- Reasoning Models ---

  /**
   * **o4-mini** is the latest small o-series model. It's optimized for fast,
   * effective reasoning with exceptionally efficient performance in coding and
   * visual tasks.
   *
   * Context window: 200,000 tokens. Max output tokens: 100,000 tokens.
   * Knowledge cutoff: June 1, 2024.
   *
   * @see https://platform.openai.com/docs/models/o4-mini
   */
  O4_MINI = "o4-mini",

  /**
   * **o3** is a well-rounded and powerful model across domains. It sets a new
   * standard for math, science, coding, and visual reasoning tasks. It also excels
   * at technical writing and instruction-following. Use it to think through
   * multi-step problems that involve analysis across text, code, and images.
   *
   * Context window: 200,000 tokens. Max output tokens: 100,000 tokens.
   * Knowledge cutoff: June 1, 2024.
   *
   * @see https://platform.openai.com/docs/models/o3
   */
  O3 = "o3",

  /**
   * **o3-mini** is a small reasoning model, providing high intelligence at cost
   * and latency targets similar to o1-mini. o3-mini supports key developer
   * features, like Structured Outputs, function calling, Batch API.
   *
   * The knowledge cutoff for o3-mini models is October, 2023.
   *
   * Context window: 200,000 tokens. Max output tokens: 100,000 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/o3-mini
   */
  O3_MINI = "o3-mini",

  /**
   * The **o1** series of models are trained with reinforcement learning to
   * perform complex reasoning. o1 models think before they answer, producing a long
   * internal chain of thought before responding to the user.
   *
   * Context window: 200,000 tokens. Max output tokens: 100,000 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/o1
   */
  O1 = "o1",

  /**
   * **o1-mini** is a faster and more affordable reasoning model compared to o1.
   * o1-mini currently only supports text inputs and outputs.
   *
   * Context window: 128,000 tokens. Max output tokens: 65,536 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/o1-mini
   */
  O1_MINI = "o1-mini",

  /**
   * The **o1-pro** model, part of the o1 series trained with reinforcement
   * learning for complex reasoning, uses more compute to think harder and provide
   * consistently better answers.
   *
   * Note: o1-pro is available in the Responses API only to enable support for
   * multi-turn model interactions and other advanced API features.
   *
   * Context window: 200,000 tokens. Max output tokens: 100,000 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/o1-pro
   */
  O1_PRO = "o1-pro",

  // --- Flagship Models ---

  /**
   * **GPT-4.1** is the flagship model for complex tasks. It is well suited for
   * problem solving across domains.
   *
   * Context window: 1,047,576 tokens. Max output tokens: 32,768 tokens.
   * Knowledge cutoff: June 1, 2024.
   *
   * @see https://platform.openai.com/docs/models/gpt-4.1
   */
  GPT_4_1 = "gpt-4.1",

  /**
   * **GPT-5** is the next-generation flagship model with enhanced capabilities
   * for complex reasoning and problem-solving tasks.
   *
   * Note: GPT-5 models require temperature=1.0 (default value). Custom temperature
   * values are not supported and will cause errors.
   *
   * @see https://platform.openai.com/docs/models/gpt-5
   */
  GPT_5 = "gpt-5",

  /**
   * GPT-5 mini is a faster, more cost-efficient version of GPT-5. It's great for
   * well-defined tasks and precise prompts.
   *
   * @see https://platform.openai.com/docs/models/gpt-5-mini
   */
  GPT_5_MINI = "gpt-5-mini",

  /**
   * GPT-5 Nano is the fastest, cheapest version of GPT-5. It's great for
   * summarization and classification tasks.
   *
   * @see https://platform.openai.com/docs/models/gpt-5-nano
   */
  GPT_5_NANO = "gpt-5-nano",

  /**
   * GPT-5 Chat points to the GPT-5 snapshot currently used in ChatGPT. GPT-5
   * accepts both text and image inputs, and produces text outputs.
   *
   * @see https://platform.openai.com/docs/models/gpt-5-chat-latest
   */
  GPT_5_CHAT_LATEST = "gpt-5-chat-latest",

  /**
   * **GPT-4o** ("o" for "omni") is the versatile, high-intelligence flagship
   * model. It accepts both text and image inputs, and produces text outputs
   * (including Structured Outputs). It is considered the best model for most tasks,
   * and the most capable model outside of the o-series models.
   *
   * Context window: 128,000 tokens. Max output tokens: 16,384 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o
   */
  GPT_4_O = "gpt-4o",

  /**
   * The **chatgpt-4o-latest** model ID continuously points to the version of
   * GPT-4o used in ChatGPT. It is updated frequently when there are significant
   * changes to ChatGPT's GPT-4o model.
   *
   * Context window: 128,000 tokens. Max output tokens: 16,384 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/chatgpt-4o-latest
   */
  CHATGPT_4_O_LATEST = "chatgpt-4o-latest",

  /**
   * **GPT-4o Audio Preview** represents a preview release of models that accept
   * audio inputs and outputs via the Chat Completions REST API.
   *
   * Context window: 128,000 tokens. Max output tokens: 16,384 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o-audio-preview
   */
  GPT_4_O_AUDIO_PREVIEW = "gpt-4o-audio-preview",

  // --- Cost-Optimized Models ---

  /**
   * **GPT-4.1-mini** provides a balance between intelligence, speed, and cost
   * that makes it an attractive model for many use cases.
   *
   * Context window: 1,047,576 tokens. Max output tokens: 32,768 tokens.
   * Knowledge cutoff: June 1, 2024.
   *
   * @see https://platform.openai.com/docs/models/gpt-4.1-mini
   */
  GPT_4_1_MINI = "gpt-4.1-mini",

  /**
   * **GPT-4.1-nano** is the fastest, most cost-effective GPT-4.1 model.
   *
   * Context window: 1,047,576 tokens. Max output tokens: 32,768 tokens.
   * Knowledge cutoff: June 1, 2024.
   *
   * @see https://platform.openai.com/docs/models/gpt-4.1-nano
   */
  GPT_4_1_NANO = "gpt-4.1-nano",

  /**
   * **GPT-4o-mini** is a fast, affordable small model for focused tasks. It
   * accepts both text and image inputs and produces text outputs (including
   * Structured Outputs). It is ideal for fine-tuning, and model outputs from a
   * larger model like GPT-4o can be distilled to GPT-4o-mini to produce similar
   * results at lower cost and latency.
   *
   * Context window: 128,000 tokens. Max output tokens: 16,384 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o-mini
   */
  GPT_4_O_MINI = "gpt-4o-mini",

  /**
   * **GPT-4o-mini Audio Preview** is a preview release model that accepts audio
   * inputs and outputs and can be used in the Chat Completions REST API.
   *
   * Context window: 128,000 tokens. Max output tokens: 16,384 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o-mini-audio-preview
   */
  GPT_4_O_MINI_AUDIO_PREVIEW = "gpt-4o-mini-audio-preview",

  // --- Realtime Models ---

  /**
   * **GPT-4o Realtime** model, is capable of responding to audio and text inputs
   * in realtime over WebRTC or a WebSocket interface.
   *
   * Context window: 128,000 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o-realtime-preview
   */
  GPT_4O_REALTIME_PREVIEW = "gpt-4o-realtime-preview",

  /**
   * **GPT-4o-mini Realtime** model, is capable of responding to audio and text
   * inputs in realtime over WebRTC or a WebSocket interface.
   *
   * Context window: 128,000 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: October 1, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4o-mini-realtime-preview
   */
  GPT_4O_MINI_REALTIME_PREVIEW = "gpt-4o-mini-realtime-preview",

  // --- Older GPT Models ---

  /**
   * **GPT-4 Turbo** is the next generation of GPT-4, an older high-intelligence
   * GPT model. It was designed to be a cheaper, better version of GPT-4. Today, we
   * recommend using a newer model like GPT-4o.
   *
   * Context window: 128,000 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: Dec 01, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4-turbo
   */
  GPT_4_TURBO = "gpt-4-turbo",

  /**
   * **GPT-4** is an older version of a high-intelligence GPT model, usable in
   * Chat Completions. Vision capabilities may not be available.
   *
   * Context window: 128,000 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: Dec 01, 2023.
   *
   * @see https://platform.openai.com/docs/models/gpt-4
   */
  GPT_4 = "gpt-4",

  /**
   * **GPT-3.5 Turbo** models can understand and generate natural language or
   * code and have been optimized for chat using the Chat Completions API but work
   * well for non-chat tasks as well. Generally lower cost but less capable than
   * GPT-4 models.
   *
   * As of July 2024, GPT-4o mini is recommended over gpt-3.5-turbo for most use
   * cases.
   *
   * Context window: 16,385 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: September, 2021.
   *
   * @see https://platform.openai.com/docs/models/gpt-3.5-turbo
   */
  GPT_3_5_TURBO = "gpt-3.5-turbo",

  /**
   * **GPT-3.5 Turbo Instruct** has similar capabilities to GPT-3 era models.
   * Compatible with the legacy Completions endpoint and not Chat Completions.
   *
   * Context window: 4,096 tokens. Max output tokens: 4,096 tokens.
   * Knowledge cutoff: September, 2021.
   */
  GPT_3_5_TURBO_INSTRUCT = "gpt-3.5-turbo-instruct",

  /**
   * **GPT-4o Search Preview** is a specialized model for web search in Chat
   * Completions. It is trained to understand and execute web search queries. See
   * the web search guide for more information.
   */
  GPT_4_O_SEARCH_PREVIEW = "gpt-4o-search-preview",

  /**
   * **GPT-4o mini Search Preview** is a specialized model for web search in Chat
   * Completions. It is trained to understand and execute web search queries. See
   * the web search guide for more information.
   */
  GPT_4_O_MINI_SEARCH_PREVIEW = "gpt-4o-mini-search-preview",
}

/**
 * The reason the model stopped generating tokens.
 */
export enum ChatCompletionFinishReason {
  /** Handles empty, NULL and unknown values. */
  UNKNOWN = "",
  /** The model hit a natural stop point or a provided stop sequence. */
  STOP = "stop",
  /** The maximum number of tokens specified in the request was reached. */
  LENGTH = "length",
  /** The content was omitted due to a flag from our content filters. */
  CONTENT_FILTER = "content_filter",
  /** The model called a tool. */
  TOOL_CALLS = "tool_calls",
  /** Only for compatibility with Mistral AI API. */
  TOOL_CALL = "tool_call",
}

/**
 * OpenAI Embeddings Models.
 * @see https://platform.openai.com/docs/models/embeddings
 */
export enum EmbeddingModel {
  /**
   * Most capable embedding model for both english and non-english tasks.
   * DIMENSION: 3072
   */
  TEXT_EMBEDDING_3_LARGE = "text-embedding-3-large",

  /**
   * Increased performance over 2nd generation ada embedding model.
   * DIMENSION: 1536
   */
  TEXT_EMBEDDING_3_SMALL = "text-embedding-3-small",

  /**
   * Most capable 2nd generation embedding model, replacing 16 first generation
   * models. DIMENSION: 1536
   */
  TEXT_EMBEDDING_ADA_002 = "text-embedding-ada-002",
}

/**
 * The type of modality for the model completion.
 */
export enum OutputModality {
  AUDIO = "audio",
  TEXT = "text",
}

/**
 * The role of the author of a message.
 */
export enum Role {
  /** System message. */
  SYSTEM = "system",
  /** User message. */
  USER = "user",
  /** Assistant message. */
  ASSISTANT = "assistant",
  /** Tool message. */
  TOOL = "tool",
}

/**
 * Specifies the processing type used for serving the request.
 */
export enum ServiceTier {
  /** The request will be processed with the service tier configured in the Project settings. */
  AUTO = "auto",
  /** The request will be processed with the standard pricing. */
  DEFAULT = "default",
  /** The request will be processed with the flex pricing. */
  FLEX = "flex",
  /** The request will be processed with the priority pricing. */
  PRIORITY = "priority",
}

/**
 * Tool type.
 */
export enum ToolType {
  /** Function tool type. */
  FUNCTION = "function",
}

/**
 * Voice type for audio output.
 */
export enum Voice {
  /** Alloy voice */
  ALLOY = "alloy",
  /** Ash voice */
  ASH = "ash",
  /** Ballad voice */
  BALLAD = "ballad",
  /** Coral voice */
  CORAL = "coral",
  /** Echo voice */
  ECHO = "echo",
  /** Fable voice */
  FABLE = "fable",
  /** Onyx voice */
  ONYX = "onyx",
  /** Nova voice */
  NOVA = "nova",
  /** Sage voice */
  SAGE = "sage",
  /** Shimmer voice */
  SHIMMER = "shimmer",
}

/**
 * Specifies the output audio format.
 */
export enum AudioResponseFormat {
  /** MP3 format */
  MP3 = "mp3",
  /** FLAC format */
  FLAC = "flac",
  /** OPUS format */
  OPUS = "opus",
  /** PCM16 format */
  PCM16 = "pcm16",
  /** WAV format */
  WAV = "wav",
}

/**
 * Input audio format.
 */
export enum InputAudioFormat {
  /** MP3 audio format */
  MP3 = "mp3",
  /** WAV audio format */
  WAV = "wav",
}

/**
 * High level guidance for the amount of context window space to use for the search.
 * One of low, medium, or high. medium is the default.
 */
export enum SearchContextSize {
  /** Low context size. */
  LOW = "low",
  /** Medium context size. This is the default. */
  MEDIUM = "medium",
  /** High context size. */
  HIGH = "high",
}

// ============================================================================
// Function Tool Types
// ============================================================================

/**
 * Function definition.
 */
export interface FunctionDefinition {
  /**
   * A description of what the function does, used by the model to choose
   * when and how to call the function.
   */
  description?: string;
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
   * underscores and dashes, with a maximum length of 64.
   */
  name: string;
  /**
   * The parameters the functions accepts, described as a JSON Schema object.
   * To describe a function that accepts no parameters, provide the value
   * `{"type": "object", "properties": {}}`.
   */
  parameters?: Record<string, unknown>;
  /**
   * Whether to enable strict schema adherence when generating the function call.
   * If set to true, the model will follow the exact schema defined in the
   * parameters field. Only a subset of JSON Schema is supported when strict is true.
   */
  strict?: boolean;
}

/**
 * Represents a tool the model may call. Currently, only functions are supported as a tool.
 */
export interface FunctionTool {
  /** The type of the tool. Currently, only 'function' is supported. */
  type: ToolType;
  /** The function definition. */
  function: FunctionDefinition;
}

// ============================================================================
// Audio Types
// ============================================================================

/**
 * Parameters for audio output. Required when audio output is requested with
 * modalities: ["audio"].
 */
export interface AudioParameters {
  /** Specifies the voice type. */
  voice: Voice;
  /** Specifies the output audio format. */
  format: AudioResponseFormat;
}

/**
 * Input audio content.
 */
export interface InputAudio {
  /** Base64 encoded audio data. */
  data: string;
  /** The format of the encoded audio data. Currently supports "wav" and "mp3". */
  format: InputAudioFormat;
}

/**
 * Audio response from the model.
 */
export interface AudioOutput {
  /** Unique identifier for the audio response from the model. */
  id: string;
  /** Audio output from the model. */
  data: string;
  /** When the audio content will no longer be available on the server. */
  expires_at: number;
  /** Transcript of the audio output from the model. */
  transcript: string;
}

// ============================================================================
// Media Content Types
// ============================================================================

/**
 * Shortcut constructor for an image content.
 *
 * Either a URL of the image or the base64 encoded image data. The base64 encoded
 * image data must have a special prefix in the following format:
 * "data:{mimetype};base64,{base64-encoded-image-data}".
 */
export interface ImageUrl {
  /**
   * Either a URL of the image or the base64 encoded image data.
   * The base64 encoded image data must have a special prefix in the following format:
   * "data:{mimetype};base64,{base64-encoded-image-data}".
   */
  url: string;
  /** Specifies the detail level of the image. */
  detail?: string;
}

/**
 * Input file content.
 */
export interface InputFile {
  /** Name of the file. */
  filename: string;
  /** File data with format "data:{mimetype};base64,{base64-encoded-image-data}". */
  file_data: string;
}

/**
 * An array of content parts with a defined type. Each MediaContent can be of
 * either "text", "image_url", or "input_audio" type. Only one option allowed.
 */
export interface MediaContent {
  /** Content type, each can be of type text or image_url. */
  type: string;
  /** The text content of the message. */
  text?: string;
  /**
   * The image content of the message. You can pass multiple images by adding
   * multiple image_url content parts. Image input is only supported when using
   * the gpt-4-visual-preview model.
   */
  image_url?: ImageUrl;
  /** Audio content part. */
  input_audio?: InputAudio;
  /** File content part. */
  file?: InputFile;
}

// ============================================================================
// Tool Call Types
// ============================================================================

/**
 * The function definition.
 */
export interface ChatCompletionFunction {
  /** The name of the function. */
  name: string;
  /** The arguments that the model expects you to pass to the function. */
  arguments: string;
}

/**
 * The relevant tool call.
 */
export interface ToolCall {
  /** The index of the tool call in the list of tool calls. Required in case of streaming. */
  index?: number;
  /**
   * The ID of the tool call. This ID must be referenced when you submit the tool
   * outputs in using the Submit tool outputs to run endpoint.
   */
  id: string;
  /** The type of tool call the output is required for. For now, this is always function. */
  type: string;
  /** The function definition. */
  function: ChatCompletionFunction;
}

// ============================================================================
// Annotation Types
// ============================================================================

/**
 * A URL citation when using web search.
 */
export interface UrlCitation {
  /** The index of the last character of the URL citation in the message. */
  end_index: number;
  /** The index of the first character of the URL citation in the message. */
  start_index: number;
  /** The title of the web resource. */
  title: string;
  /** The URL of the web resource. */
  url: string;
}

/**
 * Represents an annotation within a message, specifically for URL citations.
 */
export interface Annotation {
  /** The type of annotation. */
  type: string;
  /** URL citation details. */
  url_citation?: UrlCitation;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message comprising the conversation.
 */
export interface ChatCompletionMessage {
  /**
   * The contents of the message. Can be either a MediaContent or a String.
   * The response message content is always a String.
   */
  content: string | MediaContent[] | null;
  /** The role of the messages author. Could be one of the Role types. */
  role: Role;
  /**
   * An optional name for the participant. Provides the model information to
   * differentiate between participants of the same role. In case of Function calling,
   * the name is the function name that the message is responding to.
   */
  name?: string;
  /** Tool call that this message is responding to. Only applicable for the TOOL role and null otherwise. */
  tool_call_id?: string;
  /**
   * The tool calls generated by the model, such as function calls.
   * Applicable only for ASSISTANT role and null otherwise.
   */
  tool_calls?: ToolCall[];
  /** The refusal message by the assistant. Applicable only for ASSISTANT role and null otherwise. */
  refusal?: string;
  /** Audio response from the model. */
  audio?: AudioOutput;
  /** Annotations for the message, when applicable, as when using the web search tool. */
  annotations?: Annotation[];
  /** Reasoning content from reasoning models. */
  reasoning_content?: string;
}

// ============================================================================
// Web Search Types
// ============================================================================

/**
 * Approximate location details.
 */
export interface ApproximateLocation {
  /** City name. */
  city?: string;
  /** Country name. */
  country?: string;
  /** Region name. */
  region?: string;
  /** Timezone. */
  timezone?: string;
}

/**
 * Approximate location parameters for the search.
 */
export interface UserLocation {
  /** The type of location approximation. Always "approximate". */
  type: string;
  /** The approximate location details. */
  approximate?: ApproximateLocation;
}

/**
 * This tool searches the web for relevant results to use in a response.
 */
export interface WebSearchOptions {
  /**
   * High level guidance for the amount of context window space to use for the
   * search. One of low, medium, or high. medium is the default.
   */
  search_context_size?: SearchContextSize;
  /** Approximate location parameters for the search. */
  user_location?: UserLocation;
}

// ============================================================================
// Stream Options
// ============================================================================

/**
 * Options for streaming response. Only set this when you set stream to true.
 */
export interface StreamOptions {
  /**
   * If set, an additional chunk will be streamed before the data: [DONE] message.
   * The usage field on this chunk shows the token usage statistics for the entire
   * request, and the choices field will always be an empty array. All other chunks
   * will also include a usage field, but with a null value.
   */
  include_usage?: boolean;
}

// ============================================================================
// Response Format Types
// ============================================================================

/**
 * An object specifying the format that the model must output. Setting to
 * `{ "type": "json_object" }` enables JSON mode, which guarantees the message
 * the model generates is valid JSON.
 */
export interface ResponseFormat {
  /** The type of response format. */
  type: string;
  /** JSON schema for structured output (when type is "json_schema"). */
  json_schema?: Record<string, unknown>;
}

// ============================================================================
// Chat Completion Request
// ============================================================================

/**
 * Creates a model request for the given chat conversation.
 */
export interface ChatCompletionRequest {
  /** A list of messages comprising the conversation so far. */
  messages: ChatCompletionMessage[];
  /** ID of the model to use. */
  model: string;
  /**
   * Whether to store the output of this chat completion request for use in
   * OpenAI's model distillation or evals products.
   */
  store?: boolean;
  /**
   * Developer-defined tags and values used for filtering completions in the
   * OpenAI's dashboard.
   */
  metadata?: Record<string, string>;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on their
   * existing frequency in the text so far, decreasing the model's likelihood to
   * repeat the same line verbatim.
   */
  frequency_penalty?: number;
  /**
   * Modify the likelihood of specified tokens appearing in the completion. Accepts a
   * JSON object that maps tokens (specified by their token ID in the tokenizer) to an
   * associated bias value from -100 to 100. Mathematically, the bias is added to the
   * logits generated by the model prior to sampling. The exact effect will vary per
   * model, but values between -1 and 1 should decrease or increase likelihood of
   * selection; values like -100 or 100 should result in a ban or exclusive selection
   * of the relevant token.
   */
  logit_bias?: Record<string, number>;
  /**
   * Whether to return log probabilities of the output tokens or not. If true, returns
   * the log probabilities of each output token returned in the 'content' of 'message'.
   */
  logprobs?: boolean;
  /**
   * An integer between 0 and 5 specifying the number of most likely tokens to return
   * at each token position, each with an associated log probability. 'logprobs' must
   * be set to 'true' if this parameter is used.
   */
  top_logprobs?: number;
  /**
   * The maximum number of tokens that can be generated in the chat completion. This
   * value can be used to control costs for text generated via API. This value is now
   * deprecated in favor of max_completion_tokens, and is not compatible with o1 series
   * models. The field is retained for use with other openai models and openai compatible
   * models.
   * @deprecated Use max_completion_tokens instead.
   */
  max_tokens?: number;
  /**
   * An upper bound for the number of tokens that can be generated for a completion,
   * including visible output tokens and reasoning tokens.
   */
  max_completion_tokens?: number;
  /**
   * How many chat completion choices to generate for each input message. Note that you
   * will be charged based on the number of generated tokens across all the choices.
   * Keep n as 1 to minimize costs.
   */
  n?: number;
  /**
   * Output types that you would like the model to generate for this request. Most
   * models are capable of generating text, which is the default: ["text"]. The
   * gpt-4o-audio-preview model can also be used to generate audio. To request that
   * this model generate both text and audio responses, you can use: ["text", "audio"].
   */
  modalities?: OutputModality[];
  /**
   * Parameters for audio output. Required when audio output is requested with
   * modalities: ["audio"].
   */
  audio?: AudioParameters;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether
   * they appear in the text so far, increasing the model's likelihood to talk about
   * new topics.
   */
  presence_penalty?: number;
  /**
   * An object specifying the format that the model must output. Setting to
   * `{ "type": "json_object" }` enables JSON mode, which guarantees the message the
   * model generates is valid JSON.
   */
  response_format?: ResponseFormat;
  /**
   * This feature is in Beta. If specified, our system will make a best effort to
   * sample deterministically, such that repeated requests with the same seed and
   * parameters should return the same result. Determinism is not guaranteed, and you
   * should refer to the system_fingerprint response parameter to monitor changes in
   * the backend.
   */
  seed?: number;
  /**
   * Specifies the latency tier to use for processing the request. This parameter is
   * relevant for customers subscribed to the scale tier service. When this parameter
   * is set, the response body will include the service_tier utilized.
   */
  service_tier?: string;
  /** Up to 4 sequences where the API will stop generating further tokens. */
  stop?: string[];
  /**
   * If set, partial message deltas will be sent. Tokens will be sent as data-only
   * server-sent events as they become available, with the stream terminated by a
   * data: [DONE] message.
   */
  stream?: boolean;
  /** Options for streaming response. Only set this when you set stream to true. */
  stream_options?: StreamOptions;
  /**
   * What sampling temperature to use, between 0 and 1. Higher values like 0.8 will
   * make the output more random, while lower values like 0.2 will make it more focused
   * and deterministic. We generally recommend altering this or top_p but not both.
   */
  temperature?: number;
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the
   * model considers the results of the tokens with top_p probability mass. So 0.1 means
   * only the tokens comprising the top 10% probability mass are considered. We generally
   * recommend altering this or temperature but not both.
   */
  top_p?: number;
  /**
   * A list of tools the model may call. Currently, only functions are supported as a
   * tool. Use this to provide a list of functions the model may generate JSON inputs for.
   */
  tools?: FunctionTool[];
  /**
   * Controls which (if any) function is called by the model. none means the model will
   * not call a function and instead generates a message. auto means the model can pick
   * between generating a message or calling a function. Specifying a particular function
   * via `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that function. none is the default when no functions are present. auto is the
   * default if functions are present.
   */
  tool_choice?: string | { type: string; function: { name: string } };
  /**
   * If set to true, the model will call all functions in the tools list in parallel.
   * Otherwise, the model will call the functions in the tools list in the order they
   * are provided.
   */
  parallel_tool_calls?: boolean;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor
   * and detect abuse.
   */
  user?: string;
  /**
   * Constrains effort on reasoning for reasoning models. Currently supported values
   * are low, medium, and high. Reducing reasoning effort can result in faster responses
   * and fewer tokens used on reasoning in a response.
   */
  reasoning_effort?: string;
  /** Options for web search. */
  web_search_options?: WebSearchOptions;
  /** Controls the verbosity of the model's response. */
  verbosity?: string;
  /** Prompt cache key. */
  prompt_cache_key?: string;
  /** Safety identifier. */
  safety_identifier?: string;
  /** Additional properties to pass to the API. */
  [key: string]: unknown;
}

// ============================================================================
// Usage Types
// ============================================================================

/**
 * Breakdown of tokens used in the prompt.
 */
export interface PromptTokensDetails {
  /** Audio input tokens present in the prompt. */
  audio_tokens?: number;
  /** Cached tokens present in the prompt. */
  cached_tokens?: number;
}

/**
 * Breakdown of tokens used in a completion.
 */
export interface CompletionTokenDetails {
  /** Number of tokens generated by the model for reasoning. */
  reasoning_tokens?: number;
  /** Number of tokens generated by the model for accepted predictions. */
  accepted_prediction_tokens?: number;
  /** Number of tokens generated by the model for audio. */
  audio_tokens?: number;
  /** Number of tokens generated by the model for rejected predictions. */
  rejected_prediction_tokens?: number;
}

/**
 * Usage statistics for the completion request.
 */
export interface Usage {
  /** Number of tokens in the generated completion. Only applicable for completion requests. */
  completion_tokens?: number;
  /** Number of tokens in the prompt. */
  prompt_tokens: number;
  /** Total number of tokens used in the request (prompt + completion). */
  total_tokens: number;
  /** Breakdown of tokens used in the prompt. */
  prompt_tokens_details?: PromptTokensDetails;
  /** Breakdown of tokens used in a completion. */
  completion_tokens_details?: CompletionTokenDetails;
}

// ============================================================================
// Log Probability Types
// ============================================================================

/**
 * The most likely tokens and their log probability, at this token position.
 */
export interface TopLogProbs {
  /** The token. */
  token: string;
  /** The log probability of the token. */
  logprob: number;
  /**
   * A list of integers representing the UTF-8 bytes representation of the token.
   * Useful in instances where characters are represented by multiple tokens and
   * their byte representations must be combined to generate the correct text
   * representation. Can be null if there is no bytes representation for the token.
   */
  bytes?: number[];
}

/**
 * Message content tokens with log probability information.
 */
export interface LogProbContent {
  /** The token. */
  token: string;
  /** The log probability of the token. */
  logprob: number;
  /**
   * A list of integers representing the UTF-8 bytes representation of the token.
   * Useful in instances where characters are represented by multiple tokens and
   * their byte representations must be combined to generate the correct text
   * representation. Can be null if there is no bytes representation for the token.
   */
  bytes?: number[];
  /**
   * List of the most likely tokens and their log probability, at this token position.
   * In rare cases, there may be fewer than the number of requested top_logprobs returned.
   */
  top_logprobs?: TopLogProbs[];
}

/**
 * Log probability information for the choice.
 */
export interface LogProbs {
  /** A list of message content tokens with log probability information. */
  content?: LogProbContent[];
  /** A list of message refusal tokens with log probability information. */
  refusal?: LogProbContent[];
}

// ============================================================================
// Chat Completion Response
// ============================================================================

/**
 * Chat completion choice.
 */
export interface Choice {
  /** The reason the model stopped generating tokens. */
  finish_reason: ChatCompletionFinishReason | null;
  /** The index of the choice in the list of choices. */
  index: number;
  /** A chat completion message generated by the model. */
  message: ChatCompletionMessage;
  /** Log probability information for the choice. */
  logprobs?: LogProbs;
}

/**
 * Represents a chat completion response returned by model, based on the provided input.
 */
export interface ChatCompletion {
  /** A unique identifier for the chat completion. */
  id: string;
  /** A list of chat completion choices. Can be more than one if n is greater than 1. */
  choices: Choice[];
  /** The Unix timestamp (in seconds) of when the chat completion was created. */
  created: number;
  /** The model used for the chat completion. */
  model: string;
  /**
   * The service tier used for processing the request. This field is only included
   * if the service_tier parameter is specified in the request.
   */
  service_tier?: string;
  /**
   * This fingerprint represents the backend configuration that the model runs with.
   * Can be used in conjunction with the seed request parameter to understand when
   * backend changes have been made that might impact determinism.
   */
  system_fingerprint?: string;
  /** The object type, which is always chat.completion. */
  object: string;
  /** Usage statistics for the completion request. */
  usage?: Usage;
}

// ============================================================================
// Chat Completion Chunk (Streaming)
// ============================================================================

/**
 * Chat completion choice for streaming.
 */
export interface ChunkChoice {
  /** The reason the model stopped generating tokens. */
  finish_reason: ChatCompletionFinishReason | null;
  /** The index of the choice in the list of choices. */
  index: number;
  /** A chat completion delta generated by streamed model responses. */
  delta: ChatCompletionMessage;
  /** Log probability information for the choice. */
  logprobs?: LogProbs;
}

/**
 * Represents a streamed chunk of a chat completion response returned by model,
 * based on the provided input.
 */
export interface ChatCompletionChunk {
  /** A unique identifier for the chat completion. Each chunk has the same ID. */
  id: string;
  /** A list of chat completion choices. Can be more than one if n is greater than 1. */
  choices: ChunkChoice[];
  /** The Unix timestamp (in seconds) of when the chat completion was created. Each chunk has the same timestamp. */
  created: number;
  /** The model used for the chat completion. */
  model: string;
  /**
   * The service tier used for processing the request. This field is only included
   * if the service_tier parameter is specified in the request.
   */
  service_tier?: string;
  /**
   * This fingerprint represents the backend configuration that the model runs with.
   * Can be used in conjunction with the seed request parameter to understand when
   * backend changes have been made that might impact determinism.
   */
  system_fingerprint?: string;
  /** The object type, which is always 'chat.completion.chunk'. */
  object: string;
  /**
   * Usage statistics for the completion request. Present in the last chunk only
   * if the StreamOptions.includeUsage is set to true.
   */
  usage?: Usage;
}

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * Represents an embedding vector returned by embedding endpoint.
 */
export interface Embedding {
  /** The index of the embedding in the list of embeddings. */
  index: number;
  /** The embedding vector, which is a list of floats. The length of vector depends on the model. */
  embedding: number[];
  /** The object type, which is always 'embedding'. */
  object: string;
}

/**
 * Creates an embedding vector representing the input text.
 */
export interface EmbeddingRequest {
  /**
   * Input text to embed, encoded as a string or array of tokens. To embed multiple
   * inputs in a single request, pass an array of strings or array of token arrays.
   * The input must not exceed the max input tokens for the model (8192 tokens for
   * text-embedding-ada-002), cannot be an empty string, and any array must be 2048
   * dimensions or less.
   */
  input: string | string[] | number[] | number[][];
  /** ID of the model to use. */
  model: string;
  /** The format to return the embeddings in. Can be either float or base64. */
  encoding_format?: string;
  /**
   * The number of dimensions the resulting output embeddings should have.
   * Only supported in text-embedding-3 and later models.
   */
  dimensions?: number;
  /** A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. */
  user?: string;
}

/**
 * List of multiple embedding responses.
 */
export interface EmbeddingList {
  /** Must have value "list". */
  object: string;
  /** List of entities. */
  data: Embedding[];
  /** ID of the model to use. */
  model: string;
  /** Usage statistics for the completion request. */
  usage: Usage;
}
