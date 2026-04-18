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
  AiProvider,
  LoggerFactory,
  Media,
  MediaFormat,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
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
  MessageType,
  Prompt,
  type ToolCallingManager,
  type ToolDefinition,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  type Usage,
  UsageCalculator,
  type UserMessage,
} from "@nestjs-ai/model";
import type OpenAI from "openai";
import type { AzureOpenAI } from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions/completions";
import { Observable } from "rxjs";
import { OpenAiSdkChatOptions } from "./open-ai-sdk-chat-options";
import { OpenAiSdkSetup } from "./setup";

export interface OpenAiSdkChatModelProps {
  client?: OpenAI | AzureOpenAI | null;
  options?: OpenAiSdkChatOptions | null;
  toolCallingManager?: ToolCallingManager | null;
  observationRegistry?: ObservationRegistry | null;
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate | null;
}

type OpenAiSdkClient = OpenAI | AzureOpenAI;

export class OpenAiSdkChatModel extends ChatModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiSdkChatOptions.DEFAULT_CHAT_MODEL;

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  static readonly DEFAULT_TOOL_CALLING_MANAGER =
    new DefaultToolCallingManager();

  private readonly logger = LoggerFactory.getLogger(OpenAiSdkChatModel.name);

  private readonly _client: OpenAiSdkClient;
  private readonly _options: OpenAiSdkChatOptions;
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _toolCallingManager: ToolCallingManager;
  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  private _observationConvention: ChatModelObservationConvention =
    OpenAiSdkChatModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiSdkChatModelProps = {}) {
    super();

    this._options =
      props.options ??
      OpenAiSdkChatOptions.builder()
        .model(OpenAiSdkChatModel.DEFAULT_MODEL_NAME)
        .build();
    this._client =
      props.client ??
      OpenAiSdkSetup.setupClient({
        baseUrl: this._options.baseUrl,
        apiKey: this._options.apiKey,
        azureADTokenProvider: this._options.azureADTokenProvider,
        azureDeploymentName: this._options.deploymentName,
        azureOpenAiServiceVersion: this._options.microsoftFoundryServiceVersion,
        organizationId: this._options.organizationId,
        isAzure: this._options.microsoftFoundry,
        isGitHubModels: this._options.gitHubModels,
        modelName: this._options.model,
        timeout: this._options.timeout,
        maxRetries: this._options.maxRetries,
        fetchOptions: this._options.fetchOptions,
        customHeaders: this._options.customHeaders,
      });
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
    this._toolCallingManager =
      props.toolCallingManager ??
      OpenAiSdkChatModel.DEFAULT_TOOL_CALLING_MANAGER;
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate();
  }

  static builder(): OpenAiSdkChatModel.Builder {
    return new OpenAiSdkChatModel.Builder();
  }

  get defaultOptions(): ChatOptions {
    return this._options.copy();
  }

  getOptions(): OpenAiSdkChatOptions {
    return this._options;
  }

  mutate(): OpenAiSdkChatModel.Builder {
    return new OpenAiSdkChatModel.Builder({
      client: this._client,
      options: this._options,
      toolCallingManager: this._toolCallingManager,
      observationRegistry: this._observationRegistry,
      toolExecutionEligibilityPredicate:
        this._toolExecutionEligibilityPredicate,
    });
  }

  setObservationConvention(
    observationConvention: ChatModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  protected override async chatPrompt(prompt: Prompt): Promise<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalCall(requestPrompt, null);
  }

  protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalStream(requestPrompt, null);
  }

  public safeAssistantMessage(
    response: ChatResponse | null,
  ): AssistantMessage | null {
    if (!response) {
      return null;
    }
    const generation = response.result;
    return generation ? generation.output : null;
  }

  private async internalCall(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Promise<ChatResponse> {
    const request = this.createRequest(prompt, false);
    const observationContext = new ChatModelObservationContext(
      prompt,
      AiProvider.OPENAI_SDK.value,
    );
    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      OpenAiSdkChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    return observation.observe(async () => {
      const chatCompletion = (await this._client.chat.completions.create(
        request as ChatCompletionCreateParams,
      )) as unknown as ChatCompletion;

      const choices = chatCompletion.choices ?? [];
      if (choices.length === 0) {
        this.logger.warn(`No choices returned for prompt: ${prompt}`);
        return new ChatResponse({ generations: [] });
      }

      const generations = choices.map((choice: any) => {
        const metadata: Record<string, unknown> = {
          id: chatCompletion.id ?? "",
          role: choice.message.role ?? "",
          index: choice.index ?? 0,
          finishReason: choice.finish_reason ?? "",
          refusal: choice.message.refusal ?? "",
          annotations: choice.message.annotations ?? [],
        };
        return this.buildGeneration(choice as any, metadata, request);
      });

      const usage = chatCompletion.usage ?? null;
      const currentUsage = usage
        ? this.getDefaultUsage(usage as any)
        : new EmptyUsage();
      const accumulatedUsage = UsageCalculator.getCumulativeUsage(
        currentUsage,
        previousChatResponse,
      );
      const response = new ChatResponse({
        generations,
        chatResponseMetadata: this.fromCompletion(
          chatCompletion as any,
          accumulatedUsage,
        ),
      });
      observationContext.setResponse(response);

      if (
        this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
          prompt.options ?? this._options,
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

        return this.internalCall(
          new Prompt(
            toolExecutionResult.conversationHistory(),
            prompt.options ?? null,
          ),
          response,
        );
      }

      return response;
    });
  }

  private internalStream(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Observable<ChatResponse> {
    const observationContext = new ChatModelObservationContext(
      prompt,
      AiProvider.OPENAI_SDK.value,
    );
    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      OpenAiSdkChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    return observation.observeStream(
      () =>
        new Observable<ChatResponse>((subscriber) => {
          void (async () => {
            try {
              const request = this.createRequest(prompt, true);
              const stream = (await this._client.chat.completions.create(
                request as ChatCompletionCreateParams,
              )) as unknown as AsyncIterable<ChatCompletionChunk>;
              const responses: ChatResponse[] = [];
              for await (const chunk of stream) {
                const response = this.chunkToChatResponse(
                  chunk,
                  request as ChatCompletionCreateParams,
                  previousChatResponse,
                );
                responses.push(response);
              }

              if (responses.length === 0) {
                subscriber.complete();
                return;
              }

              const aggregated = this.aggregateStreamResponses(responses);
              if (!aggregated) {
                for (const response of responses) {
                  subscriber.next(response);
                }
                subscriber.complete();
                return;
              }

              observationContext.setResponse(aggregated);

              if (
                this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
                  prompt.options ?? this._options,
                  aggregated,
                )
              ) {
                const toolExecutionResult =
                  await this._toolCallingManager.executeToolCalls(
                    prompt,
                    aggregated,
                  );

                if (toolExecutionResult.returnDirect()) {
                  subscriber.next(
                    ChatResponse.builder()
                      .from(aggregated)
                      .generations(
                        ToolExecutionResult.buildGenerations(
                          toolExecutionResult,
                        ),
                      )
                      .build(),
                  );
                  subscriber.complete();
                  return;
                }

                const nested = this.internalStream(
                  new Prompt(
                    toolExecutionResult.conversationHistory(),
                    prompt.options ?? null,
                  ),
                  aggregated,
                );
                nested.subscribe({
                  next: (value) => subscriber.next(value),
                  error: (error) => subscriber.error(error),
                  complete: () => subscriber.complete(),
                });
                return;
              }

              for (const response of responses) {
                subscriber.next(response);
              }
              subscriber.complete();
            } catch (error) {
              subscriber.error(error);
            }
          })();
        }),
    );
  }

  buildRequestPrompt(prompt: Prompt): Prompt {
    const requestBuilder = this._options.mutate();

    if (prompt.options != null) {
      if (prompt.options.topK != null) {
        this.logger.warn(
          "The topK option is not supported by OpenAI chat models. Ignoring.",
        );
      }
      requestBuilder.combineWith(prompt.options.mutate() as any);
    }

    const requestOptions = requestBuilder.build();
    if (requestOptions.toolCallbacks.length > 0) {
      // Validate eagerly so we fail before the SDK request is made.
      for (const toolCallback of requestOptions.toolCallbacks) {
        assert(toolCallback, "toolCallback cannot be null");
      }
    }
    return new Prompt(prompt.instructions, requestOptions);
  }

  createRequest(prompt: Prompt, stream: boolean): ChatCompletionCreateParams {
    const chatCompletionMessageParams = prompt.instructions.flatMap((message) =>
      this.toMessageParams(message),
    );

    const requestOptions = prompt.options as OpenAiSdkChatOptions;
    const request: ChatCompletionCreateParamsBase = {
      messages: chatCompletionMessageParams,
      model: requestOptions.model ?? OpenAiSdkChatOptions.DEFAULT_CHAT_MODEL,
      stream,
    };

    if (requestOptions.frequencyPenalty != null) {
      request.frequency_penalty = requestOptions.frequencyPenalty;
    }
    if (requestOptions.logitBias != null) {
      request.logit_bias = requestOptions.logitBias;
    }
    if (requestOptions.logprobs != null) {
      request.logprobs = requestOptions.logprobs;
    }
    if (requestOptions.topLogprobs != null) {
      request.top_logprobs = requestOptions.topLogprobs;
    }
    if (requestOptions.maxTokens != null) {
      request.max_tokens = requestOptions.maxTokens;
    }
    if (requestOptions.maxCompletionTokens != null) {
      request.max_completion_tokens = requestOptions.maxCompletionTokens;
    }
    if (requestOptions.n != null) {
      request.n = requestOptions.n;
    }
    if (requestOptions.outputModalities != null) {
      request.modalities = requestOptions.outputModalities;
    }
    if (requestOptions.outputAudio != null) {
      request.audio = requestOptions.outputAudio;
    }
    if (requestOptions.presencePenalty != null) {
      request.presence_penalty = requestOptions.presencePenalty;
    }
    if (requestOptions.responseFormat != null) {
      request.response_format = requestOptions.responseFormat;
    }
    if (requestOptions.streamOptions != null) {
      request.stream_options = requestOptions.streamOptions;
    }
    if (requestOptions.seed != null) {
      request.seed = requestOptions.seed;
    }
    if (requestOptions.stop != null) {
      request.stop = requestOptions.stop;
    }
    if (requestOptions.temperature != null) {
      request.temperature = requestOptions.temperature;
    }
    if (requestOptions.topP != null) {
      request.top_p = requestOptions.topP;
    }
    if (requestOptions.toolChoice != null) {
      request.tool_choice = requestOptions.toolChoice;
    }
    if (requestOptions.parallelToolCalls != null) {
      request.parallel_tool_calls = requestOptions.parallelToolCalls;
    }
    if (requestOptions.user != null) {
      request.user = requestOptions.user;
    }
    if (requestOptions.store != null) {
      request.store = requestOptions.store;
    }
    if (requestOptions.metadata != null) {
      request.metadata = requestOptions.metadata;
    }
    if (requestOptions.reasoningEffort != null) {
      request.reasoning_effort = requestOptions.reasoningEffort;
    }
    if (requestOptions.verbosity != null) {
      request.verbosity = requestOptions.verbosity;
    }
    if (requestOptions.serviceTier != null) {
      request.service_tier = requestOptions.serviceTier;
    }
    if (requestOptions.extraBody != null) {
      Object.assign(request, requestOptions.extraBody);
    }

    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      request.tools = this.getFunctionTools(toolDefinitions);
    }

    if (request.stream_options && !stream) {
      this.logger.warn(
        "Removing streamOptions from the request as it is not a streaming request!",
      );
      delete request.stream_options;
    }

    return request;
  }

  private toMessageParams(message: any): ChatCompletionMessageParam[] {
    if (
      message.messageType.getValue() === MessageType.USER.getValue() ||
      message.messageType.getValue() === MessageType.SYSTEM.getValue()
    ) {
      const userOrSystemMessage = message as UserMessage;
      const content = userOrSystemMessage.text ?? "";
      const media = userOrSystemMessage.media ?? [];

      if (media.length === 0) {
        return [
          {
            role:
              message.messageType.getValue() === MessageType.SYSTEM.getValue()
                ? "system"
                : "user",
            content,
          } as ChatCompletionMessageParam,
        ];
      }

      const parts: any[] = [];
      if (content.trim().length > 0) {
        parts.push({ type: "text", text: content });
      }
      for (const item of media) {
        const mapped = this.mapMediaToContentPart(item);
        if (mapped != null) {
          parts.push(mapped);
        }
      }

      return [
        {
          role:
            message.messageType.getValue() === MessageType.SYSTEM.getValue()
              ? "system"
              : "user",
          content: parts,
        } as unknown as ChatCompletionMessageParam,
      ];
    }

    if (message.messageType.getValue() === MessageType.ASSISTANT.getValue()) {
      const assistantMessage = message as AssistantMessage;
      const toolCalls = assistantMessage.toolCalls.map((toolCall) => ({
        id: toolCall.id,
        type: "function" as const,
        function: {
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
      }));
      return [
        {
          role: "assistant",
          content: assistantMessage.text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        } as unknown as ChatCompletionMessageParam,
      ];
    }

    if (message.messageType.getValue() === MessageType.TOOL.getValue()) {
      const toolMessage = message as ToolResponseMessage;
      return toolMessage.responses.map((response) => ({
        role: "tool",
        content: response.responseData,
        tool_call_id: response.id,
        name: response.name,
      })) as ChatCompletionMessageParam[];
    }

    throw new Error(`Unsupported message type: ${message.messageType}`);
  }

  private mapMediaToContentPart(media: Media): any {
    const mimeType = media.mimeType.toString().toLowerCase();
    if (mimeType.startsWith("image/")) {
      return {
        type: "image_url",
        image_url: {
          url: this.fromMediaData(mimeType, media.data),
        },
      };
    }
    if (
      mimeType === MediaFormat.AUDIO_MP3 ||
      mimeType === MediaFormat.AUDIO_MPEG
    ) {
      return {
        type: "input_audio",
        input_audio: {
          data: this.fromAudioData(media.data),
          format: "mp3",
        },
      };
    }
    if (mimeType === MediaFormat.AUDIO_WAV) {
      return {
        type: "input_audio",
        input_audio: {
          data: this.fromAudioData(media.data),
          format: "wav",
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
    return null;
  }

  private chunkToChatCompletion(chunk: ChatCompletionChunk): ChatCompletion {
    return {
      id: chunk.id,
      choices: chunk.choices.map((choice: any) => ({
        finish_reason: choice.finish_reason ?? "stop",
        index: choice.index,
        message: {
          role: choice.delta.role ?? "assistant",
          content: choice.delta.content ?? null,
          refusal: choice.delta.refusal ?? null,
          annotations: choice.delta.annotations ?? [],
          tool_calls: choice.delta.tool_calls ?? undefined,
          audio: undefined,
          function_call: choice.delta.function_call ?? undefined,
        } as any,
        logprobs: choice.logprobs ?? undefined,
      })),
      created: chunk.created,
      model: chunk.model,
      object: "chat.completion",
      service_tier: chunk.service_tier ?? undefined,
      system_fingerprint: chunk.system_fingerprint ?? undefined,
      usage: chunk.usage ?? undefined,
    };
  }

  private chunkToChatResponse(
    chunk: ChatCompletionChunk,
    request: ChatCompletionCreateParams,
    previousChatResponse: ChatResponse | null,
  ): ChatResponse {
    const chatCompletion = this.chunkToChatCompletion(chunk);
    const choices = chatCompletion.choices ?? [];
    const generations = choices.map((choice: any) => {
      const metadata: Record<string, unknown> = {
        id: chatCompletion.id ?? "",
        role: choice.message.role ?? "",
        index: choice.index ?? 0,
        finishReason: choice.finish_reason ?? "",
        refusal: choice.message.refusal ?? "",
        annotations: choice.message.annotations ?? [],
        chunkChoice: choice,
      };
      return this.buildGeneration(choice as any, metadata, request);
    });

    const usage = chatCompletion.usage ?? null;
    const currentUsage = usage
      ? this.getDefaultUsage(usage as any)
      : new EmptyUsage();
    const accumulatedUsage = UsageCalculator.getCumulativeUsage(
      currentUsage,
      previousChatResponse,
    );

    return new ChatResponse({
      generations,
      chatResponseMetadata: this.fromCompletion(
        chatCompletion,
        accumulatedUsage,
      ),
    });
  }

  private buildGeneration(
    choice: any,
    metadata: Record<string, unknown>,
    request: ChatCompletionCreateParams,
  ): Generation {
    const message = choice.message;
    let toolCalls: Array<{
      id: string;
      type: string;
      name: string;
      arguments: string;
    }> = [];

    if (
      metadata.chunkChoice &&
      (metadata.chunkChoice as any).delta?.tool_calls
    ) {
      toolCalls = (metadata.chunkChoice as any).delta.tool_calls
        .filter((toolCall: any) => toolCall.function != null)
        .map((toolCall: any) => ({
          id: toolCall.id ?? "",
          type: "function",
          name: toolCall.function?.name ?? "",
          arguments: toolCall.function?.arguments ?? "",
        }));
    } else if (message.tool_calls) {
      toolCalls = message.tool_calls
        .filter((toolCall: any) => toolCall.function != null)
        .map((toolCall: any) => ({
          id: toolCall.id ?? "",
          type: "function",
          name: toolCall.function.name ?? "",
          arguments: toolCall.function.arguments ?? "",
        }));
    }

    const generationMetadataBuilder =
      ChatGenerationMetadata.builder().finishReason(choice.finish_reason ?? "");

    let textContent = message.content ?? "";
    const media: Media[] = [];

    if (message.audio?.data && request.audio) {
      const audioFormat = String(
        (request.audio as { format?: string }).format ?? "mp3",
      ).toLowerCase();
      const audioData = Buffer.from(message.audio.data, "base64");
      media.push(
        new Media({
          mimeType: `audio/${audioFormat}`,
          data: audioData,
          id: message.audio.id ?? null,
        }),
      );
      if (!textContent) {
        textContent = message.audio.transcript ?? "";
      }
      generationMetadataBuilder.metadata("audioId", message.audio.id);
      generationMetadataBuilder.metadata(
        "audioExpiresAt",
        message.audio.expires_at,
      );
    }
    const assistantMessage = new AssistantMessage({
      content: textContent,
      properties: metadata,
      toolCalls,
      media: media.length > 0 ? media : undefined,
    });

    return new Generation({
      assistantMessage,
      chatGenerationMetadata: generationMetadataBuilder.build(),
    });
  }

  private fromCompletion(
    result: ChatCompletion,
    usage: Usage,
  ): ChatResponseMetadata {
    assert(result, "OpenAI ChatCompletion must not be null");
    return ChatResponseMetadata.builder()
      .id(result.id ?? "")
      .usage(usage)
      .model(result.model ?? "")
      .keyValue("created", result.created)
      .build();
  }

  private getDefaultUsage(usage: any): DefaultUsage {
    return new DefaultUsage({
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
      nativeUsage: usage,
    });
  }

  private aggregateStreamResponses(
    responses: ChatResponse[],
  ): ChatResponse | null {
    if (responses.length === 0) {
      return null;
    }

    const builders = new Map<string, ToolCallBuilder>();
    let text = "";
    let props: Record<string, unknown> = {};
    let finalMetadata: ChatResponseMetadata | null = null;
    let finalGenMetadata: ChatGenerationMetadata | null = null;

    for (const chatResponse of responses) {
      const assistantMessage = this.safeAssistantMessage(chatResponse);
      if (!assistantMessage) {
        continue;
      }

      if (assistantMessage.text) {
        text += assistantMessage.text;
      }
      props = { ...props, ...(assistantMessage.metadata ?? {}) };

      if (assistantMessage.toolCalls.length > 0) {
        const chunkChoice = assistantMessage.metadata?.chunkChoice as any;

        if (chunkChoice?.delta?.tool_calls) {
          for (
            let i = 0;
            i < assistantMessage.toolCalls.length &&
            i < chunkChoice.delta.tool_calls.length;
            i += 1
          ) {
            const toolCall = assistantMessage.toolCalls[i];
            const deltaCall = chunkChoice.delta.tool_calls[i] as {
              index: number;
            };
            const key = `${chunkChoice.index ?? 0}-${deltaCall.index}`;
            const toolCallBuilder = builders.get(key) ?? new ToolCallBuilder();
            toolCallBuilder.merge(toolCall);
            builders.set(key, toolCallBuilder);
          }
        } else {
          for (const toolCall of assistantMessage.toolCalls) {
            const toolCallBuilder =
              builders.get(toolCall.id) ?? new ToolCallBuilder();
            toolCallBuilder.merge(toolCall);
            builders.set(toolCall.id, toolCallBuilder);
          }
        }
      }

      const generation = chatResponse.result;
      if (generation && generation.metadata && !generation.metadata.isEmpty) {
        finalGenMetadata = generation.metadata;
      }
      finalMetadata = chatResponse.metadata;
    }

    const mergedToolCalls = [...builders.values()]
      .map((builder) => builder.build())
      .filter((toolCall) => toolCall.name.trim().length > 0);

    const assistantMessage = new AssistantMessage({
      content: text,
      properties: props,
      toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
    });

    const aggregated = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage,
          chatGenerationMetadata:
            finalGenMetadata ?? ChatGenerationMetadata.NULL,
        }),
      ],
      chatResponseMetadata:
        finalMetadata ?? ChatResponseMetadata.builder().build(),
    });

    return aggregated;
  }

  private getFunctionTools(
    toolDefinitions: ToolDefinition[],
  ): ChatCompletionTool[] {
    return toolDefinitions.map((toolDefinition) => ({
      type: "function",
      function: {
        description: toolDefinition.description,
        name: toolDefinition.name,
        parameters: JSON.parse(toolDefinition.inputSchema),
      },
    }));
  }

  private fromAudioData(audioData: unknown): string {
    if (Buffer.isBuffer(audioData)) {
      return audioData.toString("base64");
    }
    if (audioData instanceof Uint8Array) {
      return Buffer.from(audioData).toString("base64");
    }
    if (typeof audioData === "string") {
      return audioData;
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
      return mediaContentData;
    }
    throw new Error(`Unsupported media data type: ${typeof mediaContentData}`);
  }
}

export namespace OpenAiSdkChatModel {
  export class Builder {
    private _client: OpenAiSdkClient | null = null;
    private _options: OpenAiSdkChatOptions | null = null;
    private _toolCallingManager: ToolCallingManager | null = null;
    private _observationRegistry: ObservationRegistry | null = null;
    private _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate | null =
      null;

    constructor(copyProps?: OpenAiSdkChatModelProps) {
      if (copyProps) {
        this._client = copyProps.client ?? null;
        this._options = copyProps.options ?? null;
        this._toolCallingManager = copyProps.toolCallingManager ?? null;
        this._observationRegistry = copyProps.observationRegistry ?? null;
        this._toolExecutionEligibilityPredicate =
          copyProps.toolExecutionEligibilityPredicate ?? null;
      }
    }

    client(client: OpenAiSdkClient): this {
      this._client = client;
      return this;
    }

    options(options: OpenAiSdkChatOptions): this {
      this._options = options;
      return this;
    }

    toolCallingManager(toolCallingManager: ToolCallingManager): this {
      this._toolCallingManager = toolCallingManager;
      return this;
    }

    observationRegistry(observationRegistry: ObservationRegistry): this {
      this._observationRegistry = observationRegistry;
      return this;
    }

    toolExecutionEligibilityPredicate(
      toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate,
    ): this {
      this._toolExecutionEligibilityPredicate =
        toolExecutionEligibilityPredicate;
      return this;
    }

    build(): OpenAiSdkChatModel {
      return new OpenAiSdkChatModel({
        client: this._client ?? undefined,
        options: this._options ?? undefined,
        toolCallingManager:
          this._toolCallingManager ??
          OpenAiSdkChatModel.DEFAULT_TOOL_CALLING_MANAGER,
        observationRegistry:
          this._observationRegistry ?? NoopObservationRegistry.INSTANCE,
        toolExecutionEligibilityPredicate:
          this._toolExecutionEligibilityPredicate ??
          new DefaultToolExecutionEligibilityPredicate(),
      });
    }
  }
}

class ToolCallBuilder {
  private id = "";
  private type = "function";
  private name = "";
  private argumentsValue = "";

  merge(toolCall: {
    id: string;
    type: string;
    name: string;
    arguments: string;
  }): void {
    if (toolCall.id.length > 0) {
      this.id = toolCall.id;
    }
    if (toolCall.type.length > 0) {
      this.type = toolCall.type;
    }
    if (toolCall.name.length > 0) {
      this.name = toolCall.name;
    }
    if (toolCall.arguments.length > 0) {
      this.argumentsValue += toolCall.arguments;
    }
  }

  build(): { id: string; type: string; name: string; arguments: string } {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      arguments: this.argumentsValue,
    };
  }
}
