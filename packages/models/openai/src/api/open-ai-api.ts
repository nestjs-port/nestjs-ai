import assert from "node:assert/strict";
import type {
	HttpClient,
	ResponseEntity,
	ResponseErrorHandler,
} from "@nestjs-ai/commons";
import { FetchHttpClient, sseStream } from "@nestjs-ai/commons";
import type { ApiKey } from "@nestjs-ai/model";
import { NoopApiKey, SimpleApiKey } from "@nestjs-ai/model";
import { from, type Observable } from "rxjs";
import { map, mergeMap, scan } from "rxjs/operators";
import { OpenAiApiConstants } from "./common";
import type {
	ChatCompletion,
	ChatCompletionChunk,
	ChatCompletionRequest,
	EmbeddingList,
	EmbeddingRequest,
	MediaContent,
} from "./open-ai-api.types";
import { ChatModel, EmbeddingModel } from "./open-ai-api.types";
import { OpenAiStreamFunctionCallingHelper } from "./open-ai-stream-function-calling-helper";

/**
 * Props for creating an OpenAiApi instance.
 */
export interface OpenAiApiProps {
	/** API base URL. */
	baseUrl?: string;
	/** OpenAI API key. */
	apiKey: ApiKey | string;
	/** Additional HTTP headers to include in requests. */
	headers?: Headers;
	/** Path to the chat completions endpoint. */
	completionsPath?: string;
	/** Path to the embeddings endpoint. */
	embeddingsPath?: string;
	/** Response error handler. */
	responseErrorHandler?: ResponseErrorHandler;
	/** HTTP client for making requests. Defaults to FetchHttpClient. */
	httpClient?: HttpClient;
}

/**
 * Single class implementation of the OpenAI Chat Completion API and OpenAI Embedding API.
 *
 * @see https://platform.openai.com/docs/api-reference/chat
 * @see https://platform.openai.com/docs/api-reference/embeddings
 */
export class OpenAiApi {
	static readonly HTTP_USER_AGENT_HEADER = "User-Agent";
	static readonly SPRING_AI_USER_AGENT = "spring-ai";
	static readonly DEFAULT_CHAT_MODEL = ChatModel.GPT_4_O;
	static readonly DEFAULT_EMBEDDING_MODEL =
		EmbeddingModel.TEXT_EMBEDDING_ADA_002;

	private static readonly SSE_DONE_PREDICATE = "[DONE]";

	private readonly _baseUrl: string;
	private readonly _apiKey: ApiKey;
	private readonly _headers: Headers;
	private readonly _completionsPath: string;
	private readonly _embeddingsPath: string;
	private readonly _responseErrorHandler?: ResponseErrorHandler;
	private readonly _httpClient: HttpClient;
	private readonly _chunkMerger = new OpenAiStreamFunctionCallingHelper();

	constructor(props: OpenAiApiProps) {
		const {
			baseUrl = OpenAiApiConstants.DEFAULT_BASE_URL,
			apiKey,
			headers = new Headers(),
			completionsPath,
			embeddingsPath,
			responseErrorHandler,
			httpClient = new FetchHttpClient(),
		} = props;

		assert(apiKey != null, "apiKey must be set");
		assert(completionsPath, "Completions Path must not be null");
		assert(embeddingsPath, "Embeddings Path must not be null");

		this._baseUrl = baseUrl;
		this._apiKey =
			typeof apiKey === "string" ? new SimpleApiKey(apiKey) : apiKey;
		this._headers = new Headers(headers);
		this._completionsPath = completionsPath;
		this._embeddingsPath = embeddingsPath;
		this._responseErrorHandler = responseErrorHandler;
		this._httpClient = httpClient;
	}

	/**
	 * Returns a builder pre-populated with the current configuration for mutation.
	 */
	mutate(): OpenAiApiBuilder {
		return new OpenAiApiBuilder(this);
	}

	/**
	 * Returns a new builder for creating an OpenAiApi instance.
	 */
	static builder(): OpenAiApiBuilder {
		return new OpenAiApiBuilder();
	}

	/**
	 * Returns a string containing all text values from the given media content list.
	 * Only elements of type "text" are processed and concatenated in order.
	 * @param content - The list of MediaContent
	 * @returns a string containing all text values from "text" type elements
	 */
	static getTextContent(content: MediaContent[]): string {
		assert(content != null, "content cannot be null");
		return content
			.filter((c) => c.type === "text")
			.map((c) => c.text ?? "")
			.join("");
	}

	/**
	 * Creates a model response for the given chat conversation.
	 * @param chatRequest - The chat completion request.
	 * @param additionalHeaders - Optional, additional HTTP headers to be added to the request.
	 * @returns Fetch Response object containing the chat completion.
	 */
	async chatCompletionEntity(
		chatRequest: ChatCompletionRequest,
		additionalHeaders: Headers = new Headers(),
	): Promise<ResponseEntity<ChatCompletion>> {
		assert(chatRequest != null, "The request body can not be null.");
		assert(
			!chatRequest.stream,
			"Request must set the stream property to false.",
		);

		const headers = this.buildHeaders(additionalHeaders);
		const url = `${this._baseUrl}${this._completionsPath}`;

		const response = await this._httpClient.fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(chatRequest),
		});

		await this.handleResponseError(response);

		return {
			body: (await response.json()) as ChatCompletion,
			status: response.status,
			headers: response.headers,
		};
	}

	/**
	 * Creates a streaming chat response for the given chat conversation.
	 * @param chatRequest - The chat completion request. Must have the stream property set to true.
	 * @param additionalHeaders - Optional, additional HTTP headers to be added to the request.
	 * @returns Returns an Observable stream from chat completion chunks.
	 */
	chatCompletionStream(
		chatRequest: ChatCompletionRequest,
		additionalHeaders: Headers = new Headers(),
	): Observable<ChatCompletionChunk> {
		assert(chatRequest != null, "The request body can not be null.");
		assert(
			chatRequest.stream === true,
			"Request must set the stream property to true.",
		);

		const init: RequestInit & {
			donePredicate?: string;
			errorHandler?: ResponseErrorHandler;
		} = {
			method: "POST",
			headers: this.buildHeaders(additionalHeaders),
			body: JSON.stringify(chatRequest),
			donePredicate: OpenAiApi.SSE_DONE_PREDICATE,
			errorHandler: this._responseErrorHandler,
		};

		return sseStream(
			this._httpClient,
			`${this._baseUrl}${this._completionsPath}`,
			init,
		).pipe(
			map((content) => JSON.parse(content) as ChatCompletionChunk),
			// Group chunks belonging to the same function call into windows.
			// Tool call chunks are buffered until finish, non-tool chunks emit immediately.
			scan<
				ChatCompletionChunk,
				{ buffer: ChatCompletionChunk[]; ready: ChatCompletionChunk[][] }
			>(
				(acc, chunk) => {
					const isToolCall =
						this._chunkMerger.isStreamingToolFunctionCall(chunk);
					const isFinish =
						this._chunkMerger.isStreamingToolFunctionCallFinish(chunk);
					const isBuffering = acc.buffer.length > 0;

					if (isToolCall && !isFinish) {
						return { buffer: [chunk], ready: [] };
					}
					if (isFinish && isBuffering) {
						return { buffer: [], ready: [[...acc.buffer, chunk]] };
					}
					if (isBuffering) {
						return { buffer: [...acc.buffer, chunk], ready: [] };
					}
					return { buffer: [], ready: [[chunk]] };
				},
				{ buffer: [], ready: [] },
			),
			mergeMap(({ ready }) => from(ready)),
			map((window) =>
				window.reduce(
					(prev, curr) => this._chunkMerger.merge(prev, curr),
					{} as ChatCompletionChunk,
				),
			),
		);
	}

	/**
	 * Creates an embedding vector representing the input text or token array.
	 * @param embeddingRequest - The embedding request.
	 * @returns Fetch Response object containing the embedding list.
	 */
	async embeddings(
		embeddingRequest: EmbeddingRequest,
	): Promise<ResponseEntity<EmbeddingList>> {
		assert(embeddingRequest != null, "The request body can not be null.");
		assert(embeddingRequest.input != null, "The input can not be null.");

		const input = embeddingRequest.input;
		assert(
			typeof input === "string" || Array.isArray(input),
			"The input must be either a String, or a List of Strings or List of List of integers.",
		);

		if (Array.isArray(input)) {
			assert(input.length > 0, "The input list can not be empty.");
			assert(input.length <= 2048, "The list must be 2048 dimensions or less");
		}

		const headers = this.buildHeaders(new Headers());
		const url = `${this._baseUrl}${this._embeddingsPath}`;

		const response = await this._httpClient.fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(embeddingRequest),
		});

		await this.handleResponseError(response);

		return {
			body: (await response.json()) as EmbeddingList,
			status: response.status,
			headers: response.headers,
		};
	}

	private buildHeaders(additionalHeaders: Headers): Headers {
		const headers = new Headers();
		headers.set("Content-Type", "application/json");
		headers.set(
			OpenAiApi.HTTP_USER_AGENT_HEADER,
			OpenAiApi.SPRING_AI_USER_AGENT,
		);

		this._headers.forEach((value, key) => {
			headers.set(key, value);
		});

		additionalHeaders.forEach((value, key) => {
			headers.set(key, value);
		});

		if (
			!headers.get("Authorization") &&
			!(this._apiKey instanceof NoopApiKey)
		) {
			headers.set("Authorization", `Bearer ${this._apiKey.value}`);
		}

		return headers;
	}

	private async handleResponseError(response: Response): Promise<void> {
		if (this._responseErrorHandler) {
			if (this._responseErrorHandler.hasError(response)) {
				await this._responseErrorHandler.handleError(response);
			}
		} else if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}
	}

	// Package-private getters for mutate/copy
	get baseUrl(): string {
		return this._baseUrl;
	}

	get apiKey(): ApiKey {
		return this._apiKey;
	}

	get headers(): Headers {
		return this._headers;
	}

	get completionsPath(): string {
		return this._completionsPath;
	}

	get embeddingsPath(): string {
		return this._embeddingsPath;
	}

	get responseErrorHandler(): ResponseErrorHandler | undefined {
		return this._responseErrorHandler;
	}

	get httpClient(): HttpClient {
		return this._httpClient;
	}
}

/**
 * Builder for creating OpenAiApi instances.
 */
export class OpenAiApiBuilder {
	private _baseUrl: string = OpenAiApiConstants.DEFAULT_BASE_URL;
	private _apiKey: ApiKey | null = null;
	private _headers: Headers = new Headers();
	private _completionsPath = "/v1/chat/completions";
	private _embeddingsPath = "/v1/embeddings";
	private _responseErrorHandler?: ResponseErrorHandler;
	private _httpClient?: HttpClient;

	constructor(api?: OpenAiApi) {
		if (api) {
			this._baseUrl = api.baseUrl;
			this._apiKey = api.apiKey;
			this._headers = new Headers(api.headers);
			this._completionsPath = api.completionsPath;
			this._embeddingsPath = api.embeddingsPath;
			this._responseErrorHandler = api.responseErrorHandler;
			this._httpClient = api.httpClient;
		}
	}

	baseUrl(baseUrl: string): this {
		assert(baseUrl, "baseUrl cannot be null or empty");
		this._baseUrl = baseUrl;
		return this;
	}

	apiKey(apiKey: ApiKey | string): this {
		assert(apiKey != null, "apiKey cannot be null");
		this._apiKey =
			typeof apiKey === "string" ? new SimpleApiKey(apiKey) : apiKey;
		return this;
	}

	headers(headers: Headers): this {
		assert(headers != null, "headers cannot be null");
		this._headers = new Headers(headers);
		return this;
	}

	completionsPath(completionsPath: string): this {
		assert(completionsPath, "completionsPath cannot be null or empty");
		this._completionsPath = completionsPath;
		return this;
	}

	embeddingsPath(embeddingsPath: string): this {
		assert(embeddingsPath, "embeddingsPath cannot be null or empty");
		this._embeddingsPath = embeddingsPath;
		return this;
	}

	responseErrorHandler(responseErrorHandler: ResponseErrorHandler): this {
		assert(responseErrorHandler != null, "responseErrorHandler cannot be null");
		this._responseErrorHandler = responseErrorHandler;
		return this;
	}

	httpClient(httpClient: HttpClient): this {
		assert(httpClient != null, "httpClient cannot be null");
		this._httpClient = httpClient;
		return this;
	}

	build(): OpenAiApi {
		assert(this._apiKey != null, "apiKey must be set");
		return new OpenAiApi({
			baseUrl: this._baseUrl,
			apiKey: this._apiKey,
			headers: this._headers,
			completionsPath: this._completionsPath,
			embeddingsPath: this._embeddingsPath,
			responseErrorHandler: this._responseErrorHandler,
			httpClient: this._httpClient,
		});
	}
}
