/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert/strict";

import { LoggerFactory, type ResponseErrorHandler } from "@nestjs-port/core";
import { RetryUtils } from "@nestjs-ai/retry";
import { Observable } from "rxjs";

import { OllamaApiConstants } from "./common/ollama-api-constants.js";
import { OllamaApiHelper } from "./ollama-api-helper.js";
import { OllamaChatOptions } from "./ollama-chat-options.js";
import type { ThinkOption } from "./think-option.js";

const logger = LoggerFactory.getLogger("OllamaApi");

/**
 * Java Client for the Ollama API. {@link https://ollama.ai}
 */
export class OllamaApi {
  static readonly REQUEST_BODY_NULL_ERROR = "The request body can not be null.";

  private readonly baseUrl: string;

  private readonly fetcher: typeof fetch;

  private readonly responseErrorHandler: ResponseErrorHandler;

  private readonly defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /**
   * Create a new OllamaApi instance
   */
  private constructor(props: {
    baseUrl: string;
    fetcher: typeof fetch;
    responseErrorHandler: ResponseErrorHandler;
  }) {
    this.baseUrl = props.baseUrl;
    this.fetcher = props.fetcher;
    this.responseErrorHandler = props.responseErrorHandler;
  }

  static builder(): OllamaApi.Builder {
    return new OllamaApi.Builder();
  }

  /** @internal Used by {@link OllamaApi.Builder}. */
  static create(props: {
    baseUrl: string;
    fetcher: typeof fetch;
    responseErrorHandler: ResponseErrorHandler;
  }): OllamaApi {
    return new OllamaApi(props);
  }

  /**
   * Generate the next message in a chat with a provided model. This is a streaming
   * endpoint (controlled by the 'stream' request property), so there will be a series of
   * responses. The final response object will include statistics and additional data
   * from the request.
   * @param chatRequest Chat request.
   * @returns Chat response.
   */
  async chat(
    chatRequest: OllamaApi.ChatRequest,
  ): Promise<OllamaApi.ChatResponse> {
    assert(chatRequest, OllamaApi.REQUEST_BODY_NULL_ERROR);
    assert(!chatRequest.stream, "Stream mode must be disabled.");

    const response = await this.fetcher(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify(chatRequest),
    });

    await this.handleResponseError(response);
    return (await response.json()) as OllamaApi.ChatResponse;
  }

  /**
   * Streaming response for the chat completion request.
   * @param chatRequest Chat request. The request must set the stream property to true.
   * @returns Chat response as an {@link Observable} stream.
   */
  streamingChat(
    chatRequest: OllamaApi.ChatRequest,
  ): Observable<OllamaApi.ChatResponse> {
    assert(chatRequest, OllamaApi.REQUEST_BODY_NULL_ERROR);
    assert(chatRequest.stream, "Request must set the stream property to true.");

    return new Observable<OllamaApi.ChatResponse>((subscriber) => {
      const controller = new AbortController();
      let isInsideTool = false;
      let window: OllamaApi.ChatResponse[] = [];

      const flush = (): void => {
        if (window.length === 0) {
          return;
        }
        // Merging the window chunks into a single chunk.
        const merged = window.reduce((prev, curr) =>
          OllamaApiHelper.merge(prev, curr),
        );
        if (logger.isTraceEnabled()) {
          logger.trace(`${merged}`);
        }
        subscriber.next(merged);
        window = [];
      };

      (async () => {
        try {
          const response = await this.fetcher(`${this.baseUrl}/api/chat`, {
            method: "POST",
            headers: this.defaultHeaders,
            body: JSON.stringify(chatRequest),
            signal: controller.signal,
          });

          await this.handleResponseError(response);

          for await (const chunk of streamNdjson<OllamaApi.ChatResponse>(
            response,
          )) {
            if (OllamaApiHelper.isStreamingToolCall(chunk)) {
              isInsideTool = true;
            }
            // Group all chunks belonging to the same function call.
            window.push(chunk);

            if (isInsideTool && OllamaApiHelper.isStreamingDone(chunk)) {
              isInsideTool = false;
              flush();
            } else if (!isInsideTool) {
              flush();
            }
          }

          flush();
          subscriber.complete();
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
          subscriber.error(error);
        }
      })();

      return () => {
        controller.abort();
      };
    });
  }

  /**
   * Generate embeddings from a model.
   * @param embeddingsRequest Embedding request.
   * @returns Embeddings response.
   */
  async embed(
    embeddingsRequest: OllamaApi.EmbeddingsRequest,
  ): Promise<OllamaApi.EmbeddingsResponse> {
    assert(embeddingsRequest, OllamaApi.REQUEST_BODY_NULL_ERROR);

    const response = await this.fetcher(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify(embeddingsRequest),
    });

    await this.handleResponseError(response);
    return (await response.json()) as OllamaApi.EmbeddingsResponse;
  }

  /**
   * List models that are available locally on the machine where Ollama is running.
   */
  async listModels(): Promise<OllamaApi.ListModelResponse> {
    const response = await this.fetcher(`${this.baseUrl}/api/tags`, {
      method: "GET",
      headers: this.defaultHeaders,
    });

    await this.handleResponseError(response);
    return (await response.json()) as OllamaApi.ListModelResponse;
  }

  /**
   * Show information about a model available locally on the machine where Ollama is
   * running.
   */
  async showModel(
    showModelRequest: OllamaApi.ShowModelRequest,
  ): Promise<OllamaApi.ShowModelResponse> {
    assert(showModelRequest, "showModelRequest must not be null");

    const response = await this.fetcher(`${this.baseUrl}/api/show`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify(showModelRequest),
    });

    await this.handleResponseError(response);
    return (await response.json()) as OllamaApi.ShowModelResponse;
  }

  /**
   * Copy a model. Creates a model with another name from an existing model.
   */
  async copyModel(copyModelRequest: OllamaApi.CopyModelRequest): Promise<void> {
    assert(copyModelRequest, "copyModelRequest must not be null");

    const response = await this.fetcher(`${this.baseUrl}/api/copy`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify(copyModelRequest),
    });

    await this.handleResponseError(response);
  }

  /**
   * Delete a model and its data.
   */
  async deleteModel(
    deleteModelRequest: OllamaApi.DeleteModelRequest,
  ): Promise<void> {
    assert(deleteModelRequest, "deleteModelRequest must not be null");

    const response = await this.fetcher(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: this.defaultHeaders,
      body: JSON.stringify(deleteModelRequest),
    });

    await this.handleResponseError(response);
  }

  /**
   * Download a model from the Ollama library. Cancelled pulls are resumed from where
   * they left off, and multiple calls will share the same download progress.
   */
  pullModel(
    pullModelRequest: OllamaApi.PullModelRequest,
  ): Observable<OllamaApi.ProgressResponse> {
    assert(pullModelRequest, "pullModelRequest must not be null");
    assert(
      pullModelRequest.stream,
      "Request must set the stream property to true.",
    );

    return new Observable<OllamaApi.ProgressResponse>((subscriber) => {
      const controller = new AbortController();

      (async () => {
        try {
          const response = await this.fetcher(`${this.baseUrl}/api/pull`, {
            method: "POST",
            headers: this.defaultHeaders,
            body: JSON.stringify(pullModelRequest),
            signal: controller.signal,
          });

          await this.handleResponseError(response);

          for await (const chunk of streamNdjson<OllamaApi.ProgressResponse>(
            response,
          )) {
            subscriber.next(chunk);
          }

          subscriber.complete();
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
          subscriber.error(error);
        }
      })();

      return () => {
        controller.abort();
      };
    });
  }

  private async handleResponseError(response: Response): Promise<void> {
    if (this.responseErrorHandler.hasError(response)) {
      await this.responseErrorHandler.handleError(response);
    }
  }
}

export namespace OllamaApi {
  /**
   * Chat message object.
   */
  export interface Message {
    /** The role of the message. */
    role: Message.Role;
    /** The content of the message. */
    content?: string | null;
    /**
     * The list of base64-encoded images to send with the message. Requires multimodal
     * models such as llava or bakllava.
     */
    images?: string[] | null;
    /** The list of tools that the model wants to use. */
    tool_calls?: Message.ToolCall[] | null;
    /** The name of the tool that was executed to inform the model of the result. */
    tool_name?: string | null;
    /** The model's thinking process. Requires thinking models such as qwen3. */
    thinking?: string | null;
  }

  export namespace Message {
    /**
     * The role of the message in the conversation.
     */
    export enum Role {
      /** System message type used as instructions to the model. */
      SYSTEM = "system",
      /** User message type. */
      USER = "user",
      /** Assistant message type. Usually the response from the model. */
      ASSISTANT = "assistant",
      /** Tool message. */
      TOOL = "tool",
    }

    /**
     * The relevant tool call.
     */
    export interface ToolCall {
      function: ToolCallFunction;
    }

    /**
     * The function definition.
     */
    export interface ToolCallFunction {
      /** The name of the function. */
      name: string;
      /** The arguments that the model expects you to pass to the function. */
      arguments: Record<string, unknown>;
      /** The index of the function call in the list of tool calls. */
      index?: number | null;
    }

    export function builder(role: Role): MessageBuilder {
      return new MessageBuilder(role);
    }
  }

  class MessageBuilder {
    private readonly _role: Message.Role;
    private _content?: string | null;
    private _images?: string[] | null;
    private _toolCalls?: Message.ToolCall[] | null;
    private _toolName?: string | null;
    private _thinking?: string | null;

    constructor(role: Message.Role) {
      this._role = role;
    }

    content(content: string | null | undefined): this {
      this._content = content;
      return this;
    }

    images(images: string[] | null | undefined): this {
      this._images = images;
      return this;
    }

    toolCalls(toolCalls: Message.ToolCall[] | null | undefined): this {
      this._toolCalls = toolCalls;
      return this;
    }

    toolName(toolName: string | null | undefined): this {
      this._toolName = toolName;
      return this;
    }

    thinking(thinking: string | null | undefined): this {
      this._thinking = thinking;
      return this;
    }

    build(): Message {
      const message: Message = { role: this._role };
      if (this._content != null) {
        message.content = this._content;
      }
      if (this._images != null) {
        message.images = this._images;
      }
      if (this._toolCalls != null) {
        message.tool_calls = this._toolCalls;
      }
      if (this._toolName != null) {
        message.tool_name = this._toolName;
      }
      if (this._thinking != null) {
        message.thinking = this._thinking;
      }
      return message;
    }
  }

  export namespace Message {
    export type Builder = MessageBuilder;
  }

  /**
   * Chat request object.
   */
  export interface ChatRequest {
    /**
     * The model to use for completion. It should be a name familiar to Ollama from the
     * {@link https://ollama.com/library Library}.
     */
    model: string;
    /** The list of messages in the chat. This can be used to keep a chat memory. */
    messages: Message[];
    /**
     * Whether to stream the response. If false, the response will be returned as a
     * single response object rather than a stream of objects.
     */
    stream: boolean;
    /**
     * The format to return the response in. It can either be the String "json" or an
     * object containing a JSON Schema definition.
     */
    format?: unknown;
    /**
     * Controls how long the model will stay loaded into memory following this request
     * (default: 5m).
     */
    keep_alive?: string | null;
    /** List of tools the model has access to. */
    tools: ChatRequest.Tool[];
    /**
     * Model-specific options. For example, "temperature" can be set through this field,
     * if the model supports it.
     */
    options: Record<string, unknown>;
    /** Think controls whether thinking/reasoning models will think before responding. */
    think?: ThinkOption | null;
  }

  export namespace ChatRequest {
    /**
     * Represents a tool the model may call. Currently, only functions are supported as a
     * tool.
     */
    export interface Tool {
      /** The type of the tool. Currently, only 'function' is supported. */
      type: Tool.Type;
      /** The function definition. */
      function: Tool.Function;
    }

    export namespace Tool {
      /**
       * Create a tool of type 'function' and the given function definition.
       */
      export enum Type {
        FUNCTION = "function",
      }

      /**
       * Function definition.
       */
      export interface Function {
        /**
         * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
         * underscores and dashes.
         */
        name: string;
        /**
         * A description of what the function does, used by the model to choose when and
         * how to call the function.
         */
        description: string;
        /**
         * The parameters the functions accepts, described as a JSON Schema object. To
         * describe a function that accepts no parameters, provide the value
         * {"type": "object", "properties": {}}.
         */
        parameters: Record<string, unknown>;
      }

      /**
       * Create a tool of type 'function' with the given function definition.
       */
      export function ofFunction(fn: Function): Tool {
        return { type: Type.FUNCTION, function: fn };
      }

      /**
       * Create a tool function definition from a JSON schema string.
       */
      export function functionFromJsonSchema(
        description: string,
        name: string,
        jsonSchema: string,
      ): Function {
        return {
          description,
          name,
          parameters: JSON.parse(jsonSchema) as Record<string, unknown>,
        };
      }
    }

    export function builder(model: string): ChatRequestBuilder {
      return new ChatRequestBuilder(model);
    }
  }

  class ChatRequestBuilder {
    private readonly _model: string;
    private _messages: Message[] = [];
    private _stream = false;
    private _format?: unknown;
    private _keepAlive?: string | null;
    private _tools: ChatRequest.Tool[] = [];
    private _options: Record<string, unknown> = {};
    private _think?: ThinkOption | null;

    constructor(model: string) {
      assert(model, "The model can not be null.");
      this._model = model;
    }

    messages(messages: Message[]): this {
      this._messages = messages;
      return this;
    }

    stream(stream: boolean): this {
      this._stream = stream;
      return this;
    }

    format(format: unknown): this {
      this._format = format;
      return this;
    }

    keepAlive(keepAlive: string | null | undefined): this {
      this._keepAlive = keepAlive;
      return this;
    }

    tools(tools: ChatRequest.Tool[]): this {
      this._tools = tools;
      return this;
    }

    options(options: Record<string, unknown> | OllamaChatOptions): this {
      assert(options, "The options can not be null.");
      const map =
        options instanceof OllamaChatOptions ? options.toMap() : options;
      this._options = OllamaChatOptions.filterNonSupportedFields(map);
      return this;
    }

    think(think: ThinkOption | null | undefined): this {
      this._think = think;
      return this;
    }

    /**
     * Enable thinking mode for the model.
     */
    enableThinking(): this {
      this._think = true;
      return this;
    }

    /**
     * Disable thinking mode for the model.
     */
    disableThinking(): this {
      this._think = false;
      return this;
    }

    /**
     * Set thinking level to "low" (for GPT-OSS model).
     */
    thinkLow(): this {
      this._think = "low";
      return this;
    }

    /**
     * Set thinking level to "medium" (for GPT-OSS model).
     */
    thinkMedium(): this {
      this._think = "medium";
      return this;
    }

    /**
     * Set thinking level to "high" (for GPT-OSS model).
     */
    thinkHigh(): this {
      this._think = "high";
      return this;
    }

    build(): ChatRequest {
      const request: ChatRequest = {
        model: this._model,
        messages: this._messages,
        stream: this._stream,
        tools: this._tools,
        options: this._options,
      };
      if (this._format !== undefined) {
        request.format = this._format;
      }
      if (this._keepAlive != null) {
        request.keep_alive = this._keepAlive;
      }
      if (this._think != null) {
        request.think = this._think;
      }
      return request;
    }
  }

  export namespace ChatRequest {
    export type Builder = ChatRequestBuilder;
  }

  // --------------------------------------------------------------------------
  // Models
  // --------------------------------------------------------------------------

  /**
   * Ollama chat response object.
   */
  export interface ChatResponse {
    /** The model used for generating the response. */
    model: string;
    /** The timestamp of the response generation. */
    created_at: string;
    /** The response {@link Message} with {@link Message.Role.ASSISTANT}. */
    message: Message;
    /** The reason the model stopped generating text. */
    done_reason?: string | null;
    /**
     * Whether this is the final response. For streaming response only the last message
     * is marked as done. If true, this response may be followed by another response with
     * the following, additional fields: context, prompt_eval_count, prompt_eval_duration,
     * eval_count, eval_duration.
     */
    done?: boolean | null;
    /** Time spent generating the response (nanoseconds). */
    total_duration?: number | null;
    /** Time spent loading the model (nanoseconds). */
    load_duration?: number | null;
    /** Number of tokens in the prompt. */
    prompt_eval_count?: number | null;
    /** Time spent evaluating the prompt (nanoseconds). */
    prompt_eval_duration?: number | null;
    /** Number of tokens in the response. */
    eval_count?: number | null;
    /** Time spent generating the response (nanoseconds). */
    eval_duration?: number | null;
  }

  /**
   * Generate embeddings from a model.
   */
  export interface EmbeddingsRequest {
    /** The name of model to generate embeddings from. */
    model: string;
    /** The text or list of text to generate embeddings for. */
    input: string[];
    /**
     * Controls how long the model will stay loaded into memory following the request
     * (default: 5m).
     */
    keep_alive?: string | null;
    /** Additional model parameters listed in the documentation for the model. */
    options?: Record<string, unknown> | null;
    /**
     * Truncates the end of each input to fit within context length. Returns error if
     * false and context length is exceeded. Defaults to true.
     */
    truncate?: boolean | null;
    dimensions?: number | null;
  }

  export namespace EmbeddingsRequest {
    /**
     * Shortcut to create an {@link EmbeddingsRequest} without options.
     */
    export function of(model: string, input: string): EmbeddingsRequest {
      return { model, input: [input] };
    }
  }

  /**
   * The response object returned from the /embedding endpoint.
   */
  export interface EmbeddingsResponse {
    /** The model used for generating the embeddings. */
    model: string;
    /**
     * The list of embeddings generated from the model. Each embedding (list of doubles)
     * corresponds to a single input text.
     */
    embeddings: number[][];
    /** The total time spent generating the embeddings. */
    total_duration: number;
    /** The time spent loading the model. */
    load_duration: number;
    /** The number of tokens in the prompt. */
    prompt_eval_count: number;
  }

  export interface Model {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: Model.Details;
  }

  export namespace Model {
    export interface Details {
      parent_model: string;
      format: string;
      family: string;
      families: string[];
      parameter_size: string;
      quantization_level: string;
    }
  }

  export interface ListModelResponse {
    models: Model[];
  }

  export interface ShowModelRequest {
    model: string;
    system?: string | null;
    verbose?: boolean | null;
    options?: Record<string, unknown> | null;
  }

  export namespace ShowModelRequest {
    export function of(model: string): ShowModelRequest {
      return { model };
    }
  }

  export interface ShowModelResponse {
    license: string;
    modelfile: string;
    parameters: string;
    template: string;
    system: string;
    details: Model.Details;
    messages: Message[];
    model_info: Record<string, unknown>;
    projector_info: Record<string, unknown>;
    capabilities: string[];
    modified_at: string;
  }

  export interface CopyModelRequest {
    source: string;
    destination: string;
  }

  export interface DeleteModelRequest {
    model: string;
  }

  export interface PullModelRequest {
    model: string;
    insecure: boolean;
    username?: string | null;
    password?: string | null;
    stream: boolean;
  }

  export namespace PullModelRequest {
    export function of(model: string): PullModelRequest {
      return { model, insecure: false, stream: true };
    }

    /**
     * Construct a {@link PullModelRequest} enforcing streaming.
     */
    export function create(props: {
      model: string;
      insecure?: boolean;
      username?: string | null;
      password?: string | null;
      stream?: boolean;
    }): PullModelRequest {
      let stream = props.stream ?? true;
      if (!stream) {
        logger.warn("Enforcing streaming of the model pull request");
        stream = true;
      }
      return {
        model: props.model,
        insecure: props.insecure ?? false,
        username: props.username ?? null,
        password: props.password ?? null,
        stream,
      };
    }
  }

  export interface ProgressResponse {
    status: string;
    digest: string;
    total: number;
    completed: number;
  }

  export class Builder {
    private _baseUrl: string = OllamaApiConstants.DEFAULT_BASE_URL;

    private _fetcher: typeof fetch = globalThis.fetch.bind(globalThis);

    private _responseErrorHandler: ResponseErrorHandler =
      RetryUtils.DEFAULT_RESPONSE_ERROR_HANDLER;

    baseUrl(baseUrl: string): this {
      assert(
        typeof baseUrl === "string" && baseUrl.length > 0,
        "baseUrl cannot be null or empty",
      );
      this._baseUrl = baseUrl;
      return this;
    }

    fetcher(fetcher: typeof fetch): this {
      assert(fetcher, "fetcher cannot be null");
      this._fetcher = fetcher;
      return this;
    }

    responseErrorHandler(responseErrorHandler: ResponseErrorHandler): this {
      assert(responseErrorHandler, "responseErrorHandler cannot be null");
      this._responseErrorHandler = responseErrorHandler;
      return this;
    }

    build(): OllamaApi {
      return OllamaApi.create({
        baseUrl: this._baseUrl,
        fetcher: this._fetcher,
        responseErrorHandler: this._responseErrorHandler,
      });
    }
  }
}

async function* streamNdjson<T>(response: Response): AsyncIterable<T> {
  if (!response.body) {
    return;
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        pending += value;
        let newlineIndex = pending.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = pending.slice(0, newlineIndex).trim();
          pending = pending.slice(newlineIndex + 1);
          if (line.length > 0) {
            yield JSON.parse(line) as T;
          }
          newlineIndex = pending.indexOf("\n");
        }
      }
      if (done) {
        const trimmed = pending.trim();
        if (trimmed.length > 0) {
          yield JSON.parse(trimmed) as T;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
