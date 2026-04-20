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
  NoopObservationRegistry,
  type ObservationRegistry,
  StringUtils,
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
  type Message,
  MessageType,
  Prompt,
  type ToolCall,
  ToolCallingChatOptions,
  type ToolCallingManager,
  type ToolDefinition,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  type Usage,
  UsageCalculator,
  UserMessage,
} from "@nestjs-ai/model";
import type { AzureOpenAI, OpenAI } from "openai";
import type {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsBase,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions/completions";
import type { FunctionParameters } from "openai/resources/shared";
import { defer, EMPTY, from, Observable } from "rxjs";
import { bufferCount, map, switchMap, toArray } from "rxjs/operators";
import { OpenAiChatOptions } from "./open-ai-chat-options";
import { OpenAiSetup } from "./setup";

type OpenAiClient = OpenAI | AzureOpenAI;
type ChatCompletionChunkChoice = ChatCompletionChunk["choices"][number];

export interface OpenAiChatModelProps {
  client?: OpenAiClient | null;
  options?: OpenAiChatOptions | null;
  toolCallingManager?: ToolCallingManager | null;
  observationRegistry?: ObservationRegistry | null;
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate | null;
}

export class OpenAiChatModel extends ChatModel {
  private static readonly DEFAULT_MODEL_NAME =
    OpenAiChatOptions.DEFAULT_CHAT_MODEL;

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  static readonly DEFAULT_TOOL_CALLING_MANAGER =
    new DefaultToolCallingManager();

  private readonly logger = LoggerFactory.getLogger(OpenAiChatModel.name);

  private readonly _client: OpenAiClient;
  private readonly _options: OpenAiChatOptions;
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _toolCallingManager: ToolCallingManager;
  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  private _observationConvention: ChatModelObservationConvention =
    OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OpenAiChatModelProps = {}) {
    super();

    this._options =
      props.options ??
      OpenAiChatOptions.builder()
        .model(OpenAiChatModel.DEFAULT_MODEL_NAME)
        .build();
    this._client =
      props.client ??
      OpenAiSetup.setupClient({
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
      props.toolCallingManager ?? OpenAiChatModel.DEFAULT_TOOL_CALLING_MANAGER;
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate();
  }

  get options(): OpenAiChatOptions {
    return this._options;
  }

  protected override async callPrompt(prompt: Prompt): Promise<ChatResponse> {
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
      AiProvider.OPENAI.value,
    );

    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    const response = await observation.observe(async () => {
      const chatCompletion = await this._client.chat.completions.create(
        request as ChatCompletionCreateParamsNonStreaming,
      );

      const choices = chatCompletion.choices ?? [];
      if (choices.length === 0) {
        this.logger.warn(`No choices returned for prompt: ${prompt}`);
        return new ChatResponse({ generations: [] });
      }

      const generations = choices.map((choice) => {
        const metadata: Record<string, unknown> = {
          id: chatCompletion.id ?? "",
          role: choice.message.role ?? "",
          index: choice.index ?? 0,
          finishReason: choice.finish_reason ?? "",
          refusal: choice.message.refusal ?? "",
          annotations: choice.message.annotations ?? [],
        };
        return this.buildGeneration(choice, metadata, request);
      });

      const usage = chatCompletion.usage ?? null;
      const currentUsage = usage
        ? this.getDefaultUsage(usage)
        : new EmptyUsage();
      const accumulatedUsage = UsageCalculator.getCumulativeUsage(
        currentUsage,
        previousChatResponse,
      );
      const chatResponse = new ChatResponse({
        generations,
        chatResponseMetadata: this.fromCompletion(
          chatCompletion,
          accumulatedUsage,
        ),
      });

      observationContext.setResponse(chatResponse);

      return chatResponse;
    });

    assert(prompt.options != null, "Prompt options must not be null");
    assert(response != null, "Chat response must not be null");

    if (
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        prompt.options,
        response,
      )
    ) {
      const toolExecutionResult =
        await this._toolCallingManager.executeToolCalls(prompt, response);
      if (toolExecutionResult.returnDirect()) {
        // Return tool execution result directly to the client.
        return ChatResponse.builder()
          .from(response)
          .generations(
            ToolExecutionResult.buildGenerations(toolExecutionResult),
          )
          .build();
      }

      // Send the tool execution result back to the model.
      return this.internalCall(
        new Prompt(toolExecutionResult.conversationHistory(), prompt.options),
        response,
      );
    }

    return response;
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

  private internalStream(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Observable<ChatResponse> {
    return defer(() => {
      const request = this.createRequest(prompt, true);
      const observationContext = new ChatModelObservationContext(
        prompt,
        AiProvider.OPENAI.value,
      );
      const observation = new ChatModelObservationDocumentation().observation(
        this._observationConvention,
        OpenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );

      return observation.observeStream(() =>
        new Observable<ChatResponse>((subscriber) => {
          void (async () => {
            try {
              const stream = await this._client.chat.completions.create(
                request as ChatCompletionCreateParamsStreaming,
              );
              for await (const chunk of stream) {
                const chatCompletion = this.chunkToChatCompletion(chunk);
                const generations = chatCompletion.choices.map(
                  (choice, index) => {
                    const metadata: Record<string, unknown> = {
                      id: chatCompletion.id,
                      role: choice.message.role,
                      index: choice.index,
                      finishReason: choice.finish_reason,
                      refusal: choice.message.refusal ?? "",
                      annotations: choice.message.annotations ?? [],
                      chunkChoice: chunk.choices[index],
                    };
                    return this.buildGeneration(choice, metadata, request);
                  },
                );

                const usage = chatCompletion.usage ?? null;
                const currentUsage = usage
                  ? this.getDefaultUsage(usage)
                  : new EmptyUsage();
                const accumulatedUsage = UsageCalculator.getCumulativeUsage(
                  currentUsage,
                  previousChatResponse,
                );
                subscriber.next(
                  new ChatResponse({
                    generations,
                    chatResponseMetadata: this.fromCompletion(
                      chatCompletion,
                      accumulatedUsage,
                    ),
                  }),
                );
              }

              subscriber.complete();
            } catch (error) {
              subscriber.error(error);
            }
          })();
        }).pipe(
          bufferCount(2, 1),
          map((bufferList) => {
            const firstResponse = bufferList[0];
            if (request.stream_options != null && bufferList.length === 2) {
              const secondResponse = bufferList[1];
              const usage = secondResponse.metadata.usage;
              return new ChatResponse({
                generations: firstResponse.results,
                chatResponseMetadata: this.fromResponseMetadata(
                  firstResponse.metadata,
                  usage,
                ),
              });
            }
            return firstResponse;
          }),
          toArray(),
          switchMap((responses) => {
            if (responses.length === 0) {
              return EMPTY;
            }

            const hasToolCalls = responses.some(
              (response) =>
                (this.safeAssistantMessage(response)?.toolCalls.length ?? 0) >
                0,
            );

            if (!hasToolCalls) {
              if (responses.length > 2) {
                // Get the finish reason
                const penultimateResponse = responses[responses.length - 2];
                // Get the usage
                const lastResponse = responses[responses.length - 1];
                const usage = lastResponse.metadata.usage;
                observationContext.setResponse(
                  new ChatResponse({
                    generations: penultimateResponse.results,
                    chatResponseMetadata: this.fromResponseMetadata(
                      penultimateResponse.metadata,
                      usage,
                    ),
                  }),
                );
              }
              return from(responses);
            }

            const aggregated = this.aggregateStreamResponses(responses);

            observationContext.setResponse(aggregated);

            if (
              this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
                prompt.options ?? this._options,
                aggregated,
              )
            ) {
              return from(
                this._toolCallingManager.executeToolCalls(prompt, aggregated),
              ).pipe(
                switchMap((toolExecutionResult) => {
                  if (toolExecutionResult.returnDirect()) {
                    return from([
                      ChatResponse.builder()
                        .from(aggregated)
                        .generations(
                          ToolExecutionResult.buildGenerations(
                            toolExecutionResult,
                          ),
                        )
                        .build(),
                    ]);
                  }

                  return this.internalStream(
                    new Prompt(
                      toolExecutionResult.conversationHistory(),
                      prompt.options,
                    ),
                    aggregated,
                  );
                }),
              );
            }

            return from([aggregated]);
          }),
        ),
      );
    });
  }

  private buildGeneration(
    choice: ChatCompletion.Choice,
    metadata: Record<string, unknown> & {
      chunkChoice?: ChatCompletionChunkChoice;
    },
    request: ChatCompletionCreateParams,
  ): Generation {
    const message = choice.message;
    let toolCalls: ToolCall[] = [];

    if (metadata.chunkChoice?.delta?.tool_calls) {
      toolCalls = metadata.chunkChoice.delta.tool_calls.flatMap((toolCall) =>
        toolCall.function == null
          ? []
          : [
              {
                id: toolCall.id ?? "",
                type: "function",
                name: toolCall.function.name ?? "",
                arguments: toolCall.function.arguments ?? "",
              },
            ],
      );
    } else if (message.tool_calls) {
      toolCalls = message.tool_calls.flatMap((toolCall) =>
        toolCall.type !== "function"
          ? []
          : [
              {
                id: toolCall.id,
                type: "function",
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            ],
      );
    }

    const generationMetadataBuilder =
      ChatGenerationMetadata.builder().finishReason(choice.finish_reason);

    let textContent = message.content ?? "";

    const media: Media[] = [];

    if (message.audio?.data && request.audio) {
      const audioFormat = request.audio.format;
      const audioData = Buffer.from(message.audio.data, "base64");
      media.push(
        new Media({
          mimeType: `audio/${audioFormat}`,
          data: audioData,
          id: message.audio.id,
        }),
      );
      if (!StringUtils.hasText(textContent)) {
        textContent = message.audio.transcript;
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
      media,
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
      .id(result.id)
      .usage(usage)
      .model(result.model)
      .keyValue("created", result.created)
      .build();
  }

  private fromResponseMetadata(
    metadata: ChatResponseMetadata,
    usage: Usage,
  ): ChatResponseMetadata {
    assert(metadata, "OpenAI ChatResponseMetadata must not be null");
    return ChatResponseMetadata.builder()
      .id(metadata.id)
      .usage(usage)
      .model(metadata.model)
      .build();
  }

  private chunkToChatCompletion(chunk: ChatCompletionChunk): ChatCompletion {
    return {
      id: chunk.id,
      choices: chunk.choices.map((choice) => ({
        finish_reason: choice.finish_reason ?? ("" as "stop"),
        index: choice.index,
        message: {
          role: "assistant",
          content: choice.delta.content ?? null,
          refusal: choice.delta.refusal ?? null,
        },
        logprobs: choice.logprobs ?? null,
      })),
      created: chunk.created,
      model: chunk.model,
      object: "chat.completion",
      usage: chunk.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  private getDefaultUsage(
    usage: NonNullable<ChatCompletion["usage"]>,
  ): DefaultUsage {
    return new DefaultUsage({
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      nativeUsage: usage,
    });
  }

  private aggregateStreamResponses(responses: ChatResponse[]): ChatResponse {
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
        const chunkChoice = assistantMessage.metadata?.chunkChoice as
          | ChatCompletionChunkChoice
          | undefined;

        if (chunkChoice?.delta?.tool_calls) {
          for (
            let i = 0;
            i < assistantMessage.toolCalls.length &&
            i < chunkChoice.delta.tool_calls.length;
            i += 1
          ) {
            const toolCall = assistantMessage.toolCalls[i];
            const deltaCall = chunkChoice.delta.tool_calls[i];
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
      if (generation?.metadata && !generation.metadata.isEmpty) {
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

    return new ChatResponse({
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
  }

  buildRequestPrompt(prompt: Prompt): Prompt {
    const requestBuilder = this._options.mutate();

    if (prompt.options != null) {
      if (prompt.options.topK != null) {
        this.logger.warn(
          "The topK option is not supported by OpenAI chat models. Ignoring.",
        );
      }
      requestBuilder.combineWith(
        prompt.options.mutate() as OpenAiChatOptions.Builder,
      );
    }

    const requestOptions = requestBuilder.build();

    ToolCallingChatOptions.validateToolCallbacks(requestOptions.toolCallbacks);

    return new Prompt(prompt.instructions, requestOptions);
  }

  createRequest(prompt: Prompt, stream: boolean): ChatCompletionCreateParams {
    const chatCompletionMessageParams = prompt.instructions.flatMap((message) =>
      this.toMessageParams(message),
    );

    const requestOptions = prompt.options as OpenAiChatOptions;
    const request: ChatCompletionCreateParamsBase = {
      messages: chatCompletionMessageParams,
      // Use deployment name if available (for Microsoft Foundry), otherwise use model name
      model:
        requestOptions.deploymentName ??
        requestOptions.model ??
        OpenAiChatOptions.DEFAULT_CHAT_MODEL,
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

    if (request.stream_options && !stream) {
      this.logger.warn(
        "Removing streamOptions from the request as it is not a streaming request!",
      );
      delete request.stream_options;
    }

    // Add the tool definitions to the request's tools parameter.
    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      request.tools = this.getChatCompletionTools(toolDefinitions);
    }

    // Add extraBody parameters as additional body properties for OpenAI-compatible
    // providers
    if (requestOptions.extraBody != null) {
      Object.assign(request, requestOptions.extraBody);
    }

    return request;
  }

  private toMessageParams(message: Message): ChatCompletionMessageParam[] {
    if (
      message.messageType === MessageType.USER ||
      message.messageType === MessageType.SYSTEM
    ) {
      // Handle simple text content for user and system messages
      const builder: ChatCompletionMessageParam =
        {} as ChatCompletionMessageParam;

      if (message instanceof UserMessage && message.media.length > 0) {
        // Handle media content (images, audio, files)
        const parts: ChatCompletionContentPart[] = [];

        const messageText = message.text;
        if (messageText != null && messageText !== "") {
          parts.push({ type: "text", text: messageText });
        }

        // Add media content parts
        message.media.forEach((media) => {
          const mimeType = media.mimeType.toString();
          if (mimeType.startsWith("image/")) {
            if (Buffer.isBuffer(media.data)) {
              parts.push({
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${media.data.toString("base64")}`,
                },
              });
            } else if (typeof media.data === "string") {
              // The Media object stores URL-like inputs as strings,
              // so we accept string as well here for image URLs.
              parts.push({
                type: "image_url",
                image_url: {
                  url: media.data,
                },
              });
            } else if (media.data instanceof Uint8Array) {
              // Assume the bytes are an image. So, convert the bytes to a base64 encoded
              // image URL.
              parts.push({
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${Buffer.from(media.data).toString("base64")}`,
                },
              });
            } else {
              this.logger.info(
                `Could not process image media with data of type: ${this.describeDataType(media.data)}. Only Buffer, Uint8Array, and string are supported for image URLs.`,
              );
            }
          } else if (mimeType.startsWith("audio/")) {
            parts.push({
              type: "input_audio",
              input_audio: {
                data: this.fromAudioData(media.data),
                format: mimeType.includes("mp3") ? "mp3" : "wav",
              },
            });
          } else {
            // Assume it's a file or other media type represented as a
            // data URL
            parts.push({
              type: "text",
              text: this.fromMediaData(media.mimeType.toString(), media.data),
            });
          }
        });
        builder.content = parts;
      } else {
        // Simple text message
        const messageText = message.text;
        if (messageText != null) {
          builder.content = messageText;
        }
      }

      if (message.messageType === MessageType.USER) {
        builder.role = "user";
      } else {
        builder.role = "system";
      }

      return [builder];
    }

    if (message.messageType === MessageType.ASSISTANT) {
      const assistantMessage = message as AssistantMessage;
      const builder: ChatCompletionAssistantMessageParam = {
        role: "assistant",
      };

      if (assistantMessage.text != null) {
        builder.content = assistantMessage.text;
      }

      const toolCalls =
        assistantMessage.toolCalls.map<ChatCompletionMessageToolCall>(
          (toolCall) => ({
            id: toolCall.id,
            type: "function",
            function: {
              name: toolCall.name,
              arguments: toolCall.arguments,
            },
          }),
        );
      if (toolCalls.length > 0) {
        builder.tool_calls = toolCalls;
      }

      return [builder];
    }

    if (message.messageType === MessageType.TOOL) {
      const toolMessage = message as ToolResponseMessage;

      if (toolMessage.responses.length === 0) {
        // The Java implementation calls `builder.build()` here, but that fails because
        // `toolCallId` is required and is not set for an empty response list.
        throw new Error(`No tool responses for tool message`);
      }
      return toolMessage.responses.map<ChatCompletionMessageParam>(
        (response) => {
          return {
            role: "tool",
            content: response.responseData,
            tool_call_id: response.id,
          };
        },
      );
    }

    throw new Error(`Unsupported message type: ${message.messageType}`);
  }

  private fromAudioData(audioData: unknown): string {
    if (Buffer.isBuffer(audioData)) {
      return audioData.toString("base64");
    }
    if (audioData instanceof Uint8Array) {
      return Buffer.from(audioData).toString("base64");
    }
    throw new Error(
      `Unsupported audio data type: ${this.describeDataType(audioData)}`,
    );
  }

  private fromMediaData(mimeType: string, mediaContentData: unknown): string {
    if (Buffer.isBuffer(mediaContentData)) {
      return `data:${mimeType};base64,${mediaContentData.toString("base64")}`;
    }
    if (mediaContentData instanceof Uint8Array) {
      // Assume the bytes are an image. So, convert the bytes to a base64 encoded
      // following the prefix pattern.
      return `data:${mimeType};base64,${Buffer.from(mediaContentData).toString("base64")}`;
    }
    if (mediaContentData instanceof URL) {
      return mediaContentData.toString();
    }
    if (typeof mediaContentData === "string") {
      // Assume the text is a URLs or a base64 encoded image prefixed by the user.
      return mediaContentData;
    }
    throw new Error(
      `Unsupported media data type: ${this.describeDataType(mediaContentData)}`,
    );
  }

  private describeDataType(data: unknown): string {
    if (data == null) {
      return String(data);
    }
    if (Buffer.isBuffer(data)) {
      return "Buffer";
    }
    if (data instanceof Uint8Array) {
      return data.constructor.name;
    }
    if (typeof data === "object") {
      const constructorName = (data as { constructor?: { name?: string } })
        .constructor?.name;
      return constructorName ?? "Object";
    }
    return typeof data;
  }

  private getChatCompletionTools(
    toolDefinitions: ToolDefinition[],
  ): ChatCompletionTool[] {
    return toolDefinitions.map((toolDefinition) => {
      const parameters: FunctionParameters = {};

      if (toolDefinition.inputSchema.length > 0) {
        // Parse the schema and add its properties directly
        try {
          const schemaMap = JSON.parse(toolDefinition.inputSchema) as Record<
            string,
            unknown
          >;

          // Add each property from the schema directly.
          Object.entries(schemaMap).forEach(([key, value]) => {
            parameters[key] = value;
          });

          // Add strict mode.
          parameters.strict = true;
        } catch (error) {
          this.logger.error("Failed to parse tool schema", error);
        }
      }

      return {
        type: "function",
        function: {
          description: toolDefinition.description,
          name: toolDefinition.name,
          parameters,
        },
      };
    });
  }

  get defaultOptions(): ChatOptions {
    return this._options.copy();
  }

  setObservationConvention(
    observationConvention: ChatModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
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
