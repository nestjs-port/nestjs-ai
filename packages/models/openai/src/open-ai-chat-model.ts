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
  type Logger,
  LoggerFactory,
  type Media,
  MediaFormat,
  NoopObservationRegistry,
  type ObservationRegistry,
  type RetryTemplate,
} from "@nestjs-ai/commons";
import type { RateLimit, ToolDefinition } from "@nestjs-ai/model";
import {
  AssistantMessage,
  ChatGenerationMetadata,
  ChatModel,
  ChatModelObservationContext,
  type ChatModelObservationConvention,
  ChatModelObservationDocumentation,
  type ChatOptions,
  ChatResponse,
  ChatResponseMetadata,
  DefaultChatModelObservationConvention,
  DefaultToolCallingManager,
  DefaultToolExecutionEligibilityPredicate,
  DefaultUsage,
  EmptyUsage,
  Generation,
  MessageAggregator,
  MessageType,
  Prompt,
  type ToolCall,
  type ToolCallingManager,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  type Usage,
  UsageCalculator,
  type UserMessage,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { defer, from, type Observable, switchMap } from "rxjs";
import { bufferCount, map } from "rxjs/operators";
import { InputAudioFormat, OpenAiApi, OpenAiApiConstants } from "./api";
import {
  type ToolCall as ApiToolCall,
  type Usage as ApiUsage,
  type AudioOutput,
  type ChatCompletion,
  type ChatCompletionChunk,
  type ChatCompletionFinishReason,
  type ChatCompletionFunction,
  type ChatCompletionMessage,
  type ChatCompletionRequest,
  type Choice,
  type FunctionTool,
  type MediaContent,
  OutputModality,
  Role,
  ToolType,
} from "./api/open-ai-api.types";
import { OpenAiResponseHeaderExtractor } from "./metadata";
import { OpenAiChatOptions } from "./open-ai-chat-options";

export interface OpenAiChatModelProps {
  openAiApi: OpenAiApi;
  defaultOptions: OpenAiChatOptions;
  toolCallingManager: ToolCallingManager;
  toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  retryTemplate: RetryTemplate;
  observationRegistry: ObservationRegistry;
}

export class OpenAiChatModel extends ChatModel {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  private readonly logger: Logger = LoggerFactory.getLogger(
    OpenAiChatModel.name,
  );

  private readonly _openAiApi: OpenAiApi;
  private readonly _defaultOptions: OpenAiChatOptions;
  private readonly _retryTemplate: RetryTemplate;
  private readonly _toolCallingManager: ToolCallingManager;
  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: ChatModelObservationConvention =
    OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiChatModelProps) {
    super();
    assert(props.openAiApi, "openAiApi cannot be null");
    assert(props.defaultOptions, "defaultOptions cannot be null");
    assert(props.toolCallingManager, "toolCallingManager cannot be null");
    assert(props.retryTemplate, "retryTemplate cannot be null");
    assert(props.observationRegistry, "observationRegistry cannot be null");
    assert(
      props.toolExecutionEligibilityPredicate,
      "toolExecutionEligibilityPredicate cannot be null",
    );

    this._openAiApi = props.openAiApi;
    this._defaultOptions = props.defaultOptions;
    this._toolCallingManager = props.toolCallingManager;
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate;
    this._retryTemplate = props.retryTemplate;
    this._observationRegistry = props.observationRegistry;
  }

  static builder(): OpenAiChatModelBuilder {
    return new OpenAiChatModelBuilder();
  }

  mutate(): OpenAiChatModelBuilder {
    return new OpenAiChatModelBuilder({
      openAiApi: this._openAiApi,
      defaultOptions: this._defaultOptions,
      toolCallingManager: this._toolCallingManager,
      toolExecutionEligibilityPredicate:
        this._toolExecutionEligibilityPredicate,
      retryTemplate: this._retryTemplate,
      observationRegistry: this._observationRegistry,
    });
  }

  clone(): OpenAiChatModel {
    return this.mutate().build();
  }

  setObservationConvention(
    observationConvention: ChatModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  protected async chatPrompt(prompt: Prompt): Promise<ChatResponse> {
    // Before moving any further, build the final request Prompt,
    // merging runtime and default options.
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalCall(requestPrompt, null);
  }

  private async internalCall(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Promise<ChatResponse> {
    const request = this.createRequest(prompt, false);
    const observationContext = new ChatModelObservationContext(
      prompt,
      OpenAiApiConstants.PROVIDER_NAME,
    );

    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    const response = await observation.observe(async () => {
      const chatResponse = await RetryUtils.execute(
        this._retryTemplate,
        async () => {
          const completionEntity = await this._openAiApi.chatCompletionEntity(
            request,
            this.getAdditionalHttpHeaders(prompt),
          );

          const chatCompletion = completionEntity.body;

          if (!chatCompletion) {
            this.logger.warn(
              `No chat completion returned for prompt: ${prompt}`,
            );
            return new ChatResponse({ generations: [] });
          }

          const choices = chatCompletion.choices;
          if (!choices) {
            this.logger.warn(`No choices returned for prompt: ${prompt}`);
            return new ChatResponse({ generations: [] });
          }

          const generations = choices.map((choice) => {
            const metadata: Record<string, unknown> = {
              id: chatCompletion.id ?? "",
              role: choice.message.role ?? "",
              index: choice.index ?? 0,
              finishReason: this.getFinishReasonString(choice.finish_reason),
              refusal: choice.message.refusal ?? "",
              annotations: choice.message.annotations ?? [],
            };
            return this.buildGeneration(choice, metadata, request);
          });

          const rateLimit =
            OpenAiResponseHeaderExtractor.extractAiResponseHeaders(
              completionEntity.headers,
            );

          // Current usage
          const usage = chatCompletion.usage;
          const currentChatResponseUsage = usage
            ? this.getDefaultUsage(usage)
            : new EmptyUsage();
          const accumulatedUsage = UsageCalculator.getCumulativeUsage(
            currentChatResponseUsage,
            previousChatResponse,
          );

          return new ChatResponse({
            generations,
            chatResponseMetadata: this.fromChatCompletion(
              chatCompletion,
              rateLimit,
              accumulatedUsage,
            ),
          });
        },
      );

      observationContext.response = chatResponse;
      return chatResponse;
    });

    if (
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        prompt.options as ChatOptions,
        response,
      )
    ) {
      const toolExecutionResult =
        await this._toolCallingManager.executeToolCalls(prompt, response);
      if (toolExecutionResult.returnDirect()) {
        return ChatResponse.builder()
          .from(response)
          .generations(
            ToolExecutionResult.buildGenerations(toolExecutionResult),
          )
          .build();
      }
      // Send the tool execution result back to the model.
      return this.internalCall(
        new Prompt(
          toolExecutionResult.conversationHistory(),
          prompt.options as ChatOptions,
        ),
        response,
      );
    }

    return response;
  }

  protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalStream(requestPrompt, null);
  }

  private internalStream(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Observable<ChatResponse> {
    return defer(() => {
      const request = this.createRequest(prompt, true);

      if (request.modalities?.includes(OutputModality.AUDIO)) {
        throw new Error(
          "Audio output is not supported for streaming requests.",
        );
      }

      if (request.audio) {
        throw new Error(
          "Audio parameters are not supported for streaming requests.",
        );
      }

      const completionChunks$ = this._openAiApi.chatCompletionStream(
        request,
        this.getAdditionalHttpHeaders(prompt),
      );

      // For chunked responses, only the first chunk contains the choice role.
      // The rest of the chunks with same ID share the same role.
      const roleMap = new Map<string, string>();

      const chatResponse$ = completionChunks$.pipe(
        map((chunk) => this.chunkToChatCompletion(chunk)),
        map((chatCompletion) => {
          try {
            // If an id is not provided, set to "NO_ID" (for compatible APIs).
            const id = chatCompletion.id ?? "NO_ID";

            const generations = chatCompletion.choices.map((choice) => {
              if (choice.message.role) {
                roleMap.set(id, choice.message.role);
              }
              const metadata: Record<string, unknown> = {
                id,
                role: roleMap.get(id) ?? "",
                index: choice.index ?? 0,
                finishReason: this.getFinishReasonString(choice.finish_reason),
                refusal: choice.message.refusal ?? "",
                annotations: choice.message.annotations ?? [],
                reasoningContent: choice.message.reasoning_content ?? "",
              };
              return this.buildGeneration(choice, metadata, request);
            });

            const usage = chatCompletion.usage;
            const currentChatResponseUsage = usage
              ? this.getDefaultUsage(usage)
              : new EmptyUsage();
            const accumulatedUsage = UsageCalculator.getCumulativeUsage(
              currentChatResponseUsage,
              previousChatResponse,
            );
            return new ChatResponse({
              generations,
              chatResponseMetadata: this.fromChatCompletion(
                chatCompletion,
                null,
                accumulatedUsage,
              ),
            });
          } catch (e) {
            this.logger.error("Error processing chat completion", e);
            return new ChatResponse({ generations: [] });
          }
        }),
      );

      const chatResponseWithUsage$ = chatResponse$.pipe(
        // When in stream mode and include_usage is enabled, OpenAI sends usage
        // only on the final chunk. Copy that usage to the previous chunk so it
        // can be accumulated consistently.
        bufferCount(2, 1),
        map((bufferList) => {
          const firstResponse = bufferList[0];
          if (request.stream_options?.include_usage === true) {
            if (bufferList.length === 2) {
              const secondResponse = bufferList[1];
              const usage = secondResponse?.metadata?.usage;
              if (usage && !UsageCalculator.isEmpty(usage)) {
                return new ChatResponse({
                  generations: firstResponse.results,
                  chatResponseMetadata: this.fromResponseMetadata(
                    firstResponse.metadata,
                    usage,
                  ),
                });
              }
            }
          }
          return firstResponse;
        }),
      );

      const flux = chatResponseWithUsage$.pipe(
        switchMap((response) => {
          if (
            this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
              prompt.options as ChatOptions,
              response,
            )
          ) {
            return from(
              this._toolCallingManager.executeToolCalls(prompt, response),
            ).pipe(
              switchMap((toolExecutionResult) => {
                if (toolExecutionResult.returnDirect()) {
                  return from([
                    ChatResponse.builder()
                      .from(response)
                      .generations(
                        ToolExecutionResult.buildGenerations(
                          toolExecutionResult,
                        ),
                      )
                      .build(),
                  ]);
                }
                // Send the tool execution result back to the model.
                return this.internalStream(
                  new Prompt(
                    toolExecutionResult.conversationHistory(),
                    prompt.options as ChatOptions,
                  ),
                  response,
                );
              }),
            );
          }
          return from([response]);
        }),
      );

      const observationContext = new ChatModelObservationContext(
        prompt,
        OpenAiApiConstants.PROVIDER_NAME,
      );
      const observation = new ChatModelObservationDocumentation().observation(
        this._observationConvention,
        OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );
      return observation.observeStream(() =>
        new MessageAggregator().aggregate(flux, (chatResponse) => {
          observationContext.response = chatResponse;
        }),
      );
    });
  }

  private getAdditionalHttpHeaders(prompt: Prompt): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(
      this._defaultOptions.httpHeaders,
    )) {
      headers.set(key, value);
    }
    if (prompt.options != null && prompt.options instanceof OpenAiChatOptions) {
      for (const [key, value] of Object.entries(
        (prompt.options as OpenAiChatOptions).httpHeaders,
      )) {
        headers.set(key, value);
      }
    }
    return headers;
  }

  private buildGeneration(
    choice: Choice,
    metadata: Record<string, unknown>,
    request: ChatCompletionRequest,
  ): Generation {
    const toolCalls: ToolCall[] = choice.message.tool_calls
      ? choice.message.tool_calls.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        }))
      : [];

    const generationMetadataBuilder =
      ChatGenerationMetadata.builder().finishReason(
        this.getFinishReasonString(choice.finish_reason),
      );

    const media: unknown[] = [];
    let textContent =
      typeof choice.message.content === "string"
        ? choice.message.content
        : null;
    const audioOutput = choice.message.audio;
    if (audioOutput?.data && request.audio) {
      const mimeType = `audio/${request.audio.format.toLowerCase()}`;
      const audioData = Buffer.from(audioOutput.data, "base64");
      media.push({
        mimeType,
        data: audioData,
        id: audioOutput.id,
      });
      if (!textContent) {
        textContent = audioOutput.transcript;
      }
      generationMetadataBuilder.metadata("audioId", audioOutput.id);
      generationMetadataBuilder.metadata(
        "audioExpiresAt",
        audioOutput.expires_at,
      );
    }

    if (request.logprobs === true) {
      generationMetadataBuilder.metadata(
        "logprobs",
        (choice as Choice & { logprobs?: unknown }).logprobs,
      );
    }

    const assistantMessage = new AssistantMessage({
      content: textContent,
      properties: metadata,
      toolCalls,
      media: media.length > 0 ? (media as never[]) : undefined,
    });
    return new Generation({
      assistantMessage,
      chatGenerationMetadata: generationMetadataBuilder.build(),
    });
  }

  private getFinishReasonString(
    finishReason: ChatCompletionFinishReason | null,
  ): string {
    if (finishReason == null) {
      return "";
    }
    return finishReason;
  }

  private fromChatCompletion(
    result: ChatCompletion,
    rateLimit: RateLimit | null,
    usage: Usage,
  ): ChatResponseMetadata {
    assert(result, "OpenAI ChatCompletion must not be null");
    const builder = ChatResponseMetadata.builder()
      .id(result.id ?? "")
      .usage(usage)
      .model(result.model ?? "")
      .keyValue("created", result.created ?? 0)
      .keyValue("system-fingerprint", result.system_fingerprint ?? "");
    if (rateLimit) {
      builder.rateLimit(rateLimit);
    }
    return builder.build();
  }

  private fromResponseMetadata(
    metadata: ChatResponseMetadata,
    usage: Usage,
  ): ChatResponseMetadata {
    const builder = ChatResponseMetadata.builder()
      .id(metadata.id)
      .model(metadata.model)
      .rateLimit(metadata.rateLimit)
      .usage(usage)
      .promptMetadata(metadata.promptMetadata);
    for (const [key, value] of metadata.entries()) {
      builder.keyValue(key, value);
    }
    return builder.build();
  }

  private chunkToChatCompletion(chunk: ChatCompletionChunk): ChatCompletion {
    const choices: Choice[] = chunk.choices.map((chunkChoice) => ({
      finish_reason: chunkChoice.finish_reason,
      index: chunkChoice.index,
      message: chunkChoice.delta,
      logprobs: chunkChoice.logprobs,
    }));

    return {
      id: chunk.id,
      choices,
      created: chunk.created,
      model: chunk.model,
      service_tier: chunk.service_tier,
      system_fingerprint: chunk.system_fingerprint,
      object: "chat.completion",
      usage: chunk.usage,
    };
  }

  private getDefaultUsage(usage: ApiUsage): DefaultUsage {
    return new DefaultUsage({
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      nativeUsage: usage,
    });
  }

  buildRequestPrompt(prompt: Prompt): Prompt {
    // Process runtime options
    let runtimeOptions: OpenAiChatOptions | null = null;
    if (prompt.options) {
      runtimeOptions = new OpenAiChatOptions(
        prompt.options as Partial<OpenAiChatOptions>,
      );
    }

    // Merge runtime options and default options
    const requestOptions = OpenAiChatModel.mergeOptions(
      runtimeOptions,
      this._defaultOptions,
    );

    // Merge options explicitly since they are not handled by simple copy
    if (runtimeOptions) {
      if (runtimeOptions.topK != null) {
        this.logger.warn(
          "The topK option is not supported by OpenAI chat models. Ignoring.",
        );
      }

      requestOptions.httpHeaders = {
        ...this._defaultOptions.httpHeaders,
        ...runtimeOptions.httpHeaders,
      };
      requestOptions.internalToolExecutionEnabled =
        runtimeOptions.internalToolExecutionEnabled ??
        this._defaultOptions.internalToolExecutionEnabled;
      requestOptions.toolNames =
        runtimeOptions.toolNames.size > 0
          ? new Set(runtimeOptions.toolNames)
          : new Set(this._defaultOptions.toolNames);
      requestOptions.toolCallbacks =
        runtimeOptions.toolCallbacks.length > 0
          ? [...runtimeOptions.toolCallbacks]
          : [...this._defaultOptions.toolCallbacks];
      requestOptions.toolContext = {
        ...this._defaultOptions.toolContext,
        ...runtimeOptions.toolContext,
      };
      requestOptions.extraBody = OpenAiChatModel.mergeExtraBody(
        runtimeOptions.extraBody,
        this._defaultOptions.extraBody,
      );
    } else {
      requestOptions.httpHeaders = { ...this._defaultOptions.httpHeaders };
      requestOptions.internalToolExecutionEnabled =
        this._defaultOptions.internalToolExecutionEnabled;
      requestOptions.toolNames = new Set(this._defaultOptions.toolNames);
      requestOptions.toolCallbacks = [...this._defaultOptions.toolCallbacks];
      requestOptions.toolContext = {
        ...this._defaultOptions.toolContext,
      };
      requestOptions.extraBody = this._defaultOptions.extraBody
        ? { ...this._defaultOptions.extraBody }
        : undefined;
    }

    return new Prompt(prompt.instructions, requestOptions);
  }

  private static mergeExtraBody(
    runtimeExtraBody?: Record<string, unknown>,
    defaultExtraBody?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!defaultExtraBody && !runtimeExtraBody) {
      return undefined;
    }
    const merged: Record<string, unknown> = {};
    if (defaultExtraBody) {
      Object.assign(merged, defaultExtraBody);
    }
    if (runtimeExtraBody) {
      Object.assign(merged, runtimeExtraBody); // runtime overrides default
    }
    return Object.keys(merged).length === 0 ? undefined : merged;
  }

  createRequest(prompt: Prompt, stream: boolean): ChatCompletionRequest {
    const chatCompletionMessages: ChatCompletionMessage[] =
      prompt.instructions.flatMap((message) => {
        if (
          message.messageType === MessageType.USER ||
          message.messageType === MessageType.SYSTEM
        ) {
          let content: string | MediaContent[] = message.text ?? "";
          if (message.messageType === MessageType.USER) {
            const userMessage = message as UserMessage;
            if (userMessage.media && userMessage.media.length > 0) {
              const contentList: MediaContent[] = [
                { type: "text", text: message.text ?? "" },
              ];
              contentList.push(
                ...userMessage.media.map((m) => this.mapToMediaContent(m)),
              );
              content = contentList;
            }
          }

          return [
            {
              content,
              role:
                message.messageType === MessageType.SYSTEM
                  ? Role.SYSTEM
                  : Role.USER,
            } as ChatCompletionMessage,
          ];
        }

        if (message.messageType === MessageType.ASSISTANT) {
          const assistantMessage = message as AssistantMessage;
          let toolCalls: ApiToolCall[] | undefined;
          if (assistantMessage.toolCalls.length > 0) {
            toolCalls = assistantMessage.toolCalls.map((toolCall) => ({
              id: toolCall.id,
              type: toolCall.type,
              function: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              } as ChatCompletionFunction,
            }));
          }
          let audio: AudioOutput | undefined;
          if (assistantMessage.media.length > 0) {
            assert(
              assistantMessage.media.length === 1,
              "Only one media content is supported for assistant messages",
            );
            audio = {
              id: assistantMessage.media[0].id ?? "",
              data: "",
              expires_at: 0,
              transcript: "",
            };
          }
          return [
            {
              content: assistantMessage.text,
              role: Role.ASSISTANT,
              tool_calls: toolCalls,
              audio,
            } as ChatCompletionMessage,
          ];
        }

        if (message.messageType === MessageType.TOOL) {
          const toolMessage = message as ToolResponseMessage;
          return toolMessage.responses.map((tr) => {
            assert(tr.id != null, "ToolResponseMessage must have an id");
            return {
              content: tr.responseData,
              role: Role.TOOL,
              name: tr.name,
              tool_call_id: tr.id,
            } as ChatCompletionMessage;
          });
        }

        throw new Error(`Unsupported message type: ${message.messageType}`);
      });

    const requestOptions = prompt.options as OpenAiChatOptions;

    let request: ChatCompletionRequest = {
      messages: chatCompletionMessages,
      model: requestOptions.model ?? OpenAiApi.DEFAULT_CHAT_MODEL,
      stream,
    };

    // Map options to request fields
    request = OpenAiChatModel.applyOptionsToRequest(requestOptions, request);

    // Add tool definitions to the request
    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      request.tools = this.getFunctionTools(toolDefinitions);
    }

    // Remove streamOptions from the request if it is not a streaming request
    if (request.stream_options && !stream) {
      this.logger.warn(
        "Removing streamOptions from the request as it is not a streaming request!",
      );
      request.stream_options = undefined;
    }

    // Apply extra body
    if (requestOptions.extraBody) {
      for (const [key, value] of Object.entries(requestOptions.extraBody)) {
        (request as Record<string, unknown>)[key] = value;
      }
    }

    return request;
  }

  private static applyOptionsToRequest(
    options: OpenAiChatOptions,
    request: ChatCompletionRequest,
  ): ChatCompletionRequest {
    if (options.frequencyPenalty != null)
      request.frequency_penalty = options.frequencyPenalty;
    if (options.logitBias != null) request.logit_bias = options.logitBias;
    if (options.logprobs != null) request.logprobs = options.logprobs;
    if (options.topLogprobs != null) request.top_logprobs = options.topLogprobs;
    if (options.maxTokens != null) request.max_tokens = options.maxTokens;
    if (options.maxCompletionTokens != null)
      request.max_completion_tokens = options.maxCompletionTokens;
    if (options.n != null) request.n = options.n;
    if (options.outputModalities != null)
      request.modalities = options.outputModalities as OutputModality[];
    if (options.outputAudio != null) request.audio = options.outputAudio;
    if (options.presencePenalty != null)
      request.presence_penalty = options.presencePenalty;
    if (options.responseFormat != null)
      request.response_format = options.responseFormat;
    if (options.streamOptions != null)
      request.stream_options = options.streamOptions;
    if (options.seed != null) request.seed = options.seed;
    if (options.stop != null) request.stop = options.stop;
    if (options.temperature != null) request.temperature = options.temperature;
    if (options.topP != null) request.top_p = options.topP;
    if (options.toolChoice != null) request.tool_choice = options.toolChoice;
    if (options.parallelToolCalls != null)
      request.parallel_tool_calls = options.parallelToolCalls;
    if (options.user != null) request.user = options.user;
    if (options.store != null) request.store = options.store;
    if (options.metadata != null) request.metadata = options.metadata;
    if (options.reasoningEffort != null)
      request.reasoning_effort = options.reasoningEffort;
    if (options.webSearchOptions != null)
      request.web_search_options = options.webSearchOptions;
    if (options.verbosity != null) request.verbosity = options.verbosity;
    if (options.serviceTier != null) request.service_tier = options.serviceTier;
    if (options.promptCacheKey != null)
      request.prompt_cache_key = options.promptCacheKey;
    if (options.safetyIdentifier != null)
      request.safety_identifier = options.safetyIdentifier;
    return request;
  }

  private mapToMediaContent(media: Media): MediaContent {
    const mimeType = media.mimeType.toLowerCase();
    if (mimeType === MediaFormat.AUDIO_MP3) {
      return {
        type: "input_audio",
        input_audio: {
          data: this.fromAudioData(media.data),
          format: InputAudioFormat.MP3,
        },
      };
    }
    if (mimeType === MediaFormat.AUDIO_WAV) {
      return {
        type: "input_audio",
        input_audio: {
          data: this.fromAudioData(media.data),
          format: InputAudioFormat.WAV,
        },
      };
    }
    if (mimeType === MediaFormat.DOC_PDF) {
      return {
        type: "file",
        file: {
          filename: media.name ?? "",
          file_data: this.fromMediaData(mimeType, media.data),
        },
      };
    }
    return {
      type: "image_url",
      image_url: {
        url: this.fromMediaData(mimeType, media.data),
      },
    };
  }

  private fromAudioData(audioData: unknown): string {
    if (Buffer.isBuffer(audioData)) {
      return audioData.toString("base64");
    }
    if (audioData instanceof Uint8Array) {
      return Buffer.from(audioData).toString("base64");
    }
    throw new Error(`Unsupported audio data type: ${typeof audioData}`);
  }

  private fromMediaData(mimeType: string, mediaContentData: unknown): string {
    if (Buffer.isBuffer(mediaContentData)) {
      return `data:${mimeType};base64,${mediaContentData.toString("base64")}`;
    }
    if (mediaContentData instanceof Uint8Array) {
      return `data:${mimeType};base64,${Buffer.from(mediaContentData).toString("base64")}`;
    }
    if (typeof mediaContentData === "string") {
      // Assume the text is a URL or a base64 encoded image prefixed by the user.
      return mediaContentData;
    }
    throw new Error(`Unsupported media data type: ${typeof mediaContentData}`);
  }

  private getFunctionTools(toolDefinitions: ToolDefinition[]): FunctionTool[] {
    return toolDefinitions.map((toolDefinition) => ({
      type: ToolType.FUNCTION,
      function: {
        description: toolDefinition.description,
        name: toolDefinition.name,
        parameters: JSON.parse(toolDefinition.inputSchema),
      },
    }));
  }

  override get defaultOptions(): ChatOptions {
    return new OpenAiChatOptions(this._defaultOptions);
  }

  private static mergeOptions(
    runtime: OpenAiChatOptions | null,
    defaults: OpenAiChatOptions,
  ): OpenAiChatOptions {
    if (!runtime) {
      return new OpenAiChatOptions(defaults);
    }

    return new OpenAiChatOptions({
      model: runtime.model ?? defaults.model,
      frequencyPenalty: runtime.frequencyPenalty ?? defaults.frequencyPenalty,
      logitBias: runtime.logitBias ?? defaults.logitBias,
      logprobs: runtime.logprobs ?? defaults.logprobs,
      topLogprobs: runtime.topLogprobs ?? defaults.topLogprobs,
      maxTokens: runtime.maxTokens ?? defaults.maxTokens,
      maxCompletionTokens:
        runtime.maxCompletionTokens ?? defaults.maxCompletionTokens,
      n: runtime.n ?? defaults.n,
      outputModalities: runtime.outputModalities ?? defaults.outputModalities,
      outputAudio: runtime.outputAudio ?? defaults.outputAudio,
      presencePenalty: runtime.presencePenalty ?? defaults.presencePenalty,
      responseFormat: runtime.responseFormat ?? defaults.responseFormat,
      streamOptions: runtime.streamOptions ?? defaults.streamOptions,
      seed: runtime.seed ?? defaults.seed,
      stop: runtime.stop ?? defaults.stop,
      temperature: runtime.temperature ?? defaults.temperature,
      topP: runtime.topP ?? defaults.topP,
      tools: runtime.tools ?? defaults.tools,
      toolChoice: runtime.toolChoice ?? defaults.toolChoice,
      user: runtime.user ?? defaults.user,
      parallelToolCalls:
        runtime.parallelToolCalls ?? defaults.parallelToolCalls,
      store: runtime.store ?? defaults.store,
      metadata: runtime.metadata ?? defaults.metadata,
      reasoningEffort: runtime.reasoningEffort ?? defaults.reasoningEffort,
      verbosity: runtime.verbosity ?? defaults.verbosity,
      webSearchOptions: runtime.webSearchOptions ?? defaults.webSearchOptions,
      serviceTier: runtime.serviceTier ?? defaults.serviceTier,
      promptCacheKey: runtime.promptCacheKey ?? defaults.promptCacheKey,
      safetyIdentifier: runtime.safetyIdentifier ?? defaults.safetyIdentifier,
    });
  }
}

interface OpenAiChatModelBuilderCopyProps {
  openAiApi: OpenAiApi;
  defaultOptions: OpenAiChatOptions;
  toolCallingManager: ToolCallingManager;
  toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  retryTemplate: RetryTemplate;
  observationRegistry: ObservationRegistry;
}

export class OpenAiChatModelBuilder {
  private static readonly DEFAULT_TOOL_CALLING_MANAGER =
    new DefaultToolCallingManager();

  private _openAiApi?: OpenAiApi;
  private _defaultOptions = new OpenAiChatOptions({
    model: OpenAiApi.DEFAULT_CHAT_MODEL,
    temperature: 0.7,
  });
  private _toolCallingManager?: ToolCallingManager;
  private _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate =
    new DefaultToolExecutionEligibilityPredicate();
  private _retryTemplate: RetryTemplate = RetryUtils.DEFAULT_RETRY_TEMPLATE;
  private _observationRegistry: ObservationRegistry =
    NoopObservationRegistry.INSTANCE;

  constructor(copyProps?: OpenAiChatModelBuilderCopyProps) {
    if (copyProps) {
      this._openAiApi = copyProps.openAiApi;
      this._defaultOptions = copyProps.defaultOptions;
      this._toolCallingManager = copyProps.toolCallingManager;
      this._toolExecutionEligibilityPredicate =
        copyProps.toolExecutionEligibilityPredicate;
      this._retryTemplate = copyProps.retryTemplate;
      this._observationRegistry = copyProps.observationRegistry;
    }
  }

  openAiApi(openAiApi: OpenAiApi): this {
    this._openAiApi = openAiApi;
    return this;
  }

  defaultOptions(defaultOptions: OpenAiChatOptions): this {
    this._defaultOptions = defaultOptions;
    return this;
  }

  toolCallingManager(toolCallingManager: ToolCallingManager): this {
    this._toolCallingManager = toolCallingManager;
    return this;
  }

  toolExecutionEligibilityPredicate(
    toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate,
  ): this {
    this._toolExecutionEligibilityPredicate = toolExecutionEligibilityPredicate;
    return this;
  }

  retryTemplate(retryTemplate: RetryTemplate): this {
    this._retryTemplate = retryTemplate;
    return this;
  }

  observationRegistry(observationRegistry: ObservationRegistry): this {
    this._observationRegistry = observationRegistry;
    return this;
  }

  build(): OpenAiChatModel {
    return new OpenAiChatModel({
      openAiApi: this._openAiApi as OpenAiApi,
      defaultOptions: this._defaultOptions,
      toolCallingManager:
        this._toolCallingManager ??
        OpenAiChatModelBuilder.DEFAULT_TOOL_CALLING_MANAGER,
      toolExecutionEligibilityPredicate:
        this._toolExecutionEligibilityPredicate,
      retryTemplate: this._retryTemplate,
      observationRegistry: this._observationRegistry,
    });
  }
}
