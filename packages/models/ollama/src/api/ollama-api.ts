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

import {
  LoggerFactory,
  type HttpClient,
  type ResponseErrorHandler,
  FetchHttpClient,
} from "@nestjs-port/core";
import {
  defer,
  filter,
  finalize,
  from,
  map,
  mergeMap,
  Observable,
  scan,
  tap,
} from "rxjs";

import { OllamaApiHelper } from "./ollama-api-helper.js";
import type { ThinkOption } from "./think-option.js";
import { RetryUtils } from "@nestjs-ai/retry";
import { OllamaApiConstants } from "./common/ollama-api-constants.js";

export interface OllamaApiProps {
  baseUrl?: string;
  httpClient?: HttpClient;
  responseErrorHandler?: ResponseErrorHandler;
}

/**
 * JavaScript Client for the Ollama API. {@link https://ollama.ai}
 */
export class OllamaApi {
  static readonly REQUEST_BODY_NULL_ERROR = "The request body can not be null.";

  private static readonly logger = LoggerFactory.getLogger(OllamaApi.name);

  private readonly baseUrl: string;

  private readonly httpClient: HttpClient;

  private readonly responseErrorHandler: ResponseErrorHandler;

  private readonly defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /**
   * Create a new OllamaApi instance
   */
  constructor(props: OllamaApiProps) {
    this.baseUrl = props.baseUrl ?? OllamaApiConstants.DEFAULT_BASE_URL;
    this.httpClient = props.httpClient ?? new FetchHttpClient();
    this.responseErrorHandler =
      props.responseErrorHandler ?? RetryUtils.DEFAULT_RESPONSE_ERROR_HANDLER;
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

    const response = await this.httpClient.fetch(`${this.baseUrl}/api/chat`, {
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

    return defer(() => {
      const controller = new AbortController();

      return from(
        this.httpClient.fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: this.defaultHeaders,
          body: JSON.stringify(chatRequest),
          signal: controller.signal,
        }),
      ).pipe(
        mergeMap((response) =>
          from(this.handleResponseError(response)).pipe(map(() => response)),
        ),
        mergeMap((response) =>
          streamNdjson<OllamaApi.ChatResponse>(response).pipe(
            scan(
              (state, chunk) => {
                const chunks = [...state.chunks, chunk];
                const insideTool =
                  state.insideTool ||
                  OllamaApiHelper.isStreamingToolCall(chunk);

                if (insideTool && OllamaApiHelper.isStreamingDone(chunk)) {
                  return {
                    insideTool: false,
                    chunks: [],
                    emit: chunks.reduce(OllamaApiHelper.merge),
                  };
                }

                if (!insideTool) {
                  return {
                    insideTool: false,
                    chunks: [],
                    emit: chunks.reduce(OllamaApiHelper.merge),
                  };
                }

                return {
                  insideTool: true,
                  chunks,
                  emit: null,
                };
              },
              {
                insideTool: false,
                chunks: [] as OllamaApi.ChatResponse[],
                emit: null as OllamaApi.ChatResponse | null,
              },
            ),
            map((state) => state.emit),
            filter((data): data is OllamaApi.ChatResponse => data != null),
            tap((data) => {
              if (OllamaApi.logger.isTraceEnabled()) {
                OllamaApi.logger.trace(`${data}`);
              }
            }),
          ),
        ),
        finalize(() => {
          controller.abort();
        }),
      );
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

    const response = await this.httpClient.fetch(`${this.baseUrl}/api/embed`, {
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
    const response = await this.httpClient.fetch(`${this.baseUrl}/api/tags`, {
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

    const response = await this.httpClient.fetch(`${this.baseUrl}/api/show`, {
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

    const response = await this.httpClient.fetch(`${this.baseUrl}/api/copy`, {
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

    const response = await this.httpClient.fetch(`${this.baseUrl}/api/delete`, {
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

    return defer(() => {
      const controller = new AbortController();

      return from(
        this.httpClient.fetch(`${this.baseUrl}/api/pull`, {
          method: "POST",
          headers: this.defaultHeaders,
          body: JSON.stringify(pullModelRequest),
          signal: controller.signal,
        }),
      ).pipe(
        mergeMap((response) =>
          from(this.handleResponseError(response)).pipe(map(() => response)),
        ),
        mergeMap((response) =>
          streamNdjson<OllamaApi.ProgressResponse>(response),
        ),
        finalize(() => {
          controller.abort();
        }),
      );
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
    }
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

  export interface ProgressResponse {
    status: string;
    digest: string;
    total: number;
    completed: number;
  }
}

function streamNdjson<T>(response: Response): Observable<T> {
  return new Observable<T>((subscriber) => {
    if (!response.body) {
      subscriber.complete();
      return;
    }

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let pending = "";
    let cancelled = false;

    void (async () => {
      try {
        while (!cancelled) {
          const { value, done } = await reader.read();

          if (value) {
            pending += value;

            let newlineIndex = pending.indexOf("\n");
            while (newlineIndex !== -1) {
              const line = pending.slice(0, newlineIndex).trim();
              pending = pending.slice(newlineIndex + 1);

              if (line.length > 0) {
                try {
                  subscriber.next(JSON.parse(line) as T);
                } catch {
                  console.warn("invalid json: ", line);
                }
              }

              newlineIndex = pending.indexOf("\n");
            }
          }

          if (done) {
            const trimmed = pending.trim();
            if (trimmed.length > 0) {
              try {
                subscriber.next(JSON.parse(trimmed) as T);
              } catch {
                console.warn("invalid json: ", trimmed);
              }
            }
            subscriber.complete();
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          subscriber.error(error);
        }
      } finally {
        reader.releaseLock();
      }
    })();

    return () => {
      cancelled = true;
      void reader.cancel().catch(() => undefined);
    };
  });
}
