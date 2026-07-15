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
  Generation,
  MessageAggregator,
  MessageType,
  Prompt,
  type ToolCallingManager,
  type ToolDefinition,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import {
  LoggerFactory,
  NoopObservationRegistry,
  type ObservationRegistry,
  type RetryTemplate,
  StringUtils,
} from "@nestjs-port/core";
import { defer, from, of, type Observable } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

import { OllamaApiConstants } from "./api/common/ollama-api-constants.js";
import { OllamaApi } from "./api/ollama-api.js";
import { OllamaChatOptions } from "./api/ollama-chat-options.js";
import { OllamaModel } from "./api/ollama-model.js";
import { ModelManagementOptions } from "./management/model-management-options.js";
import { OllamaModelManager } from "./management/ollama-model-manager.js";
import { PullModelStrategy } from "./management/pull-model-strategy.js";

export interface OllamaChatModelProps {
  ollamaApi: OllamaApi;
  defaultOptions?: OllamaChatOptions | null;
  toolCallingManager?: ToolCallingManager | null;
  observationRegistry?: ObservationRegistry | null;
  modelManagementOptions?: ModelManagementOptions | null;
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate | null;
  retryTemplate?: RetryTemplate | null;
}

/**
 * {@link ChatModel} implementation for Ollama. Ollama allows developers to run
 * large language models and generate embeddings locally.
 */
export class OllamaChatModel extends ChatModel {
  private static readonly DONE = "done";

  private static readonly METADATA_PROMPT_EVAL_COUNT = "prompt-eval-count";

  private static readonly METADATA_EVAL_COUNT = "eval-count";

  private static readonly METADATA_CREATED_AT = "created-at";

  private static readonly METADATA_TOTAL_DURATION = "total-duration";

  private static readonly METADATA_LOAD_DURATION = "load-duration";

  private static readonly METADATA_PROMPT_EVAL_DURATION =
    "prompt-eval-duration";

  private static readonly METADATA_EVAL_DURATION = "eval-duration";

  private static readonly THINKING_METADATA_KEY = "thinking";

  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  private static readonly DEFAULT_TOOL_CALLING_MANAGER =
    new DefaultToolCallingManager();

  private readonly logger = LoggerFactory.getLogger(OllamaChatModel.name);

  private readonly _chatApi: OllamaApi;

  private readonly _defaultOptions: OllamaChatOptions;

  private readonly _observationRegistry: ObservationRegistry;

  private readonly _modelManager: OllamaModelManager;

  private readonly _toolCallingManager: ToolCallingManager;

  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;

  private readonly _retryTemplate: RetryTemplate;

  private readonly _initializePromise: Promise<void>;

  private _observationConvention: ChatModelObservationConvention =
    OllamaChatModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: OllamaChatModelProps) {
    super();
    assert(props.ollamaApi, "ollamaApi must not be null");

    this._chatApi = props.ollamaApi;
    this._defaultOptions =
      props.defaultOptions ??
      OllamaChatOptions.builder().model(OllamaModel.MISTRAL).build();
    this._toolCallingManager =
      props.toolCallingManager ?? OllamaChatModel.DEFAULT_TOOL_CALLING_MANAGER;
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;

    const modelManagementOptions =
      props.modelManagementOptions ?? ModelManagementOptions.defaults();
    this._modelManager = new OllamaModelManager({
      ollamaApi: this._chatApi,
      options: modelManagementOptions,
    });
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate();
    this._retryTemplate =
      props.retryTemplate ?? RetryUtils.DEFAULT_RETRY_TEMPLATE;

    const model = this._defaultOptions.model;
    assert(model != null, "model must not be null");
    this._initializePromise = this.initializeModel(
      model,
      modelManagementOptions.pullModelStrategy,
    );
  }

  static from(
    response: OllamaApi.ChatResponse,
    previousChatResponse: ChatResponse | null,
  ): ChatResponseMetadata {
    assert(response, "OllamaApi.ChatResponse must not be null");

    const newUsage = OllamaChatModel.getDefaultUsage(response);
    let promptTokens = newUsage.promptTokens;
    let generationTokens = newUsage.completionTokens;
    let totalTokens = newUsage.totalTokens;

    let evalDuration = response.eval_duration ?? null;
    let promptEvalDuration = response.prompt_eval_duration ?? null;
    let loadDuration = response.load_duration ?? null;
    let totalDuration = response.total_duration ?? null;

    if (previousChatResponse?.metadata != null) {
      const metadataEvalDuration = previousChatResponse.metadata.get<number>(
        OllamaChatModel.METADATA_EVAL_DURATION,
      );
      if (metadataEvalDuration != null && evalDuration != null) {
        evalDuration += metadataEvalDuration;
      }
      const metadataPromptEvalDuration =
        previousChatResponse.metadata.get<number>(
          OllamaChatModel.METADATA_PROMPT_EVAL_DURATION,
        );
      if (metadataPromptEvalDuration != null && promptEvalDuration != null) {
        promptEvalDuration += metadataPromptEvalDuration;
      }
      const metadataLoadDuration = previousChatResponse.metadata.get<number>(
        OllamaChatModel.METADATA_LOAD_DURATION,
      );
      if (metadataLoadDuration != null && loadDuration != null) {
        loadDuration += metadataLoadDuration;
      }
      const metadataTotalDuration = previousChatResponse.metadata.get<number>(
        OllamaChatModel.METADATA_TOTAL_DURATION,
      );
      if (metadataTotalDuration != null && totalDuration != null) {
        totalDuration += metadataTotalDuration;
      }
      const previousUsage = previousChatResponse.metadata.usage;
      promptTokens += previousUsage.promptTokens;
      generationTokens += previousUsage.completionTokens;
      totalTokens += previousUsage.totalTokens;
    }

    const aggregatedUsage = new DefaultUsage({
      promptTokens,
      completionTokens: generationTokens,
      totalTokens,
    });

    return ChatResponseMetadata.builder()
      .usage(aggregatedUsage)
      .model(response.model)
      .keyValue(OllamaChatModel.METADATA_CREATED_AT, response.created_at)
      .keyValue(OllamaChatModel.METADATA_EVAL_DURATION, evalDuration)
      .keyValue(
        OllamaChatModel.METADATA_EVAL_COUNT,
        aggregatedUsage.completionTokens,
      )
      .keyValue(OllamaChatModel.METADATA_LOAD_DURATION, loadDuration)
      .keyValue(
        OllamaChatModel.METADATA_PROMPT_EVAL_DURATION,
        promptEvalDuration,
      )
      .keyValue(
        OllamaChatModel.METADATA_PROMPT_EVAL_COUNT,
        aggregatedUsage.promptTokens,
      )
      .keyValue(OllamaChatModel.METADATA_TOTAL_DURATION, totalDuration)
      .keyValue(OllamaChatModel.DONE, response.done)
      .build();
  }

  protected override async callPrompt(prompt: Prompt): Promise<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    this.verifyPromptChatOptions(requestPrompt);
    return this.internalCall(requestPrompt, null);
  }

  protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    this.verifyPromptChatOptions(requestPrompt);
    return this.internalStream(requestPrompt, null);
  }

  override get defaultOptions(): ChatOptions {
    return OllamaChatOptions.fromOptions(this._defaultOptions);
  }

  private verifyPromptChatOptions(prompt: Prompt): void {
    const chatOptions = prompt.options;
    if (chatOptions != null && !StringUtils.hasText(chatOptions.model)) {
      throw new Error("model cannot be null or empty");
    }
  }

  ollamaChatRequest(prompt: Prompt, stream: boolean): OllamaApi.ChatRequest {
    const ollamaMessages = prompt.instructions.flatMap((message) => {
      if (message.messageType === MessageType.SYSTEM) {
        return [
          {
            role: OllamaApi.Message.Role.SYSTEM,
            content: message.text,
          },
        ];
      }
      if (message.messageType === MessageType.USER) {
        const ollamaMessage: OllamaApi.Message = {
          role: OllamaApi.Message.Role.USER,
          content: message.text,
        };
        if (message instanceof UserMessage && message.media.length > 0) {
          ollamaMessage.images = message.media.map((media) =>
            this.fromMediaData(media.data),
          );
        }
        return [ollamaMessage];
      }
      if (message.messageType === MessageType.ASSISTANT) {
        const assistantMessage = message as AssistantMessage;
        const toolCalls =
          assistantMessage.toolCalls.length > 0
            ? assistantMessage.toolCalls.map((toolCall) => ({
                id: toolCall.id,
                function: {
                  name: toolCall.name,
                  arguments: JSON.parse(toolCall.arguments) as Record<
                    string,
                    unknown
                  >,
                },
              }))
            : null;
        return [
          {
            role: OllamaApi.Message.Role.ASSISTANT,
            content: assistantMessage.text,
            tool_calls: toolCalls,
          },
        ];
      }
      if (message.messageType === MessageType.TOOL) {
        const toolMessage = message as ToolResponseMessage;
        return toolMessage.responses.map((response) => ({
          role: OllamaApi.Message.Role.TOOL,
          content: response.responseData,
        }));
      }
      throw new Error(`Unsupported message type: ${message.messageType}`);
    });

    const requestOptions =
      prompt.options instanceof OllamaChatOptions
        ? prompt.options
        : OllamaChatOptions.fromOptions(prompt.options as OllamaChatOptions);

    const model = requestOptions.model;
    assert(model != null, "model must not be null");

    const request: OllamaApi.ChatRequest = {
      model,
      stream,
      messages: ollamaMessages,
      options: OllamaChatOptions.filterNonSupportedFields(
        requestOptions.toMap(),
      ),
      think: requestOptions.thinkOption,
      tools: [],
    };

    if (requestOptions.format != null) {
      request.format = requestOptions.format;
    }
    if (requestOptions.keepAlive != null) {
      request.keep_alive = requestOptions.keepAlive;
    }

    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      request.tools = this.getTools(toolDefinitions);
    }

    return request;
  }

  setObservationConvention(
    observationConvention: ChatModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  private async internalCall(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Promise<ChatResponse> {
    await this._initializePromise;

    const request = this.ollamaChatRequest(prompt, false);
    const observationContext = new ChatModelObservationContext(
      prompt,
      OllamaApiConstants.PROVIDER_NAME,
    );

    const response = await new ChatModelObservationDocumentation()
      .observation(
        this._observationConvention,
        OllamaChatModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      )
      .observe(async () => {
        const ollamaResponse = await RetryUtils.execute(
          this._retryTemplate,
          () => this._chatApi.chat(request),
        );
        const chatResponse = this.toChatResponse(
          ollamaResponse,
          previousChatResponse,
          false,
        );

        observationContext.setResponse(chatResponse);
        return chatResponse;
      });

    const options = prompt.options;
    assert(options != null, "ChatOptions must not be null");
    if (
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        options,
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
        new Prompt(toolExecutionResult.conversationHistory(), options),
        response,
      );
    }

    return response;
  }

  private internalStream(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Observable<ChatResponse> {
    return defer(() =>
      from(this._initializePromise).pipe(
        mergeMap(() => {
          const request = this.ollamaChatRequest(prompt, true);
          const observationContext = new ChatModelObservationContext(
            prompt,
            OllamaApiConstants.PROVIDER_NAME,
          );

          const observation =
            new ChatModelObservationDocumentation().observation(
              this._observationConvention,
              OllamaChatModel.DEFAULT_OBSERVATION_CONVENTION,
              () => observationContext,
              this._observationRegistry,
            );

          return observation.observeStream(() => {
            const chatResponse = this._chatApi
              .streamingChat(request)
              .pipe(
                map((chunk) =>
                  this.toChatResponse(chunk, previousChatResponse, true),
                ),
              );
            const chatResponseFlux = chatResponse.pipe(
              mergeMap((response) =>
                this.handleStreamingToolExecution(prompt, response),
              ),
            );

            return new MessageAggregator().aggregate(
              chatResponseFlux,
              (aggregatedResponse) => {
                observationContext.setResponse(aggregatedResponse);
              },
            );
          });
        }),
      ),
    );
  }

  private handleStreamingToolExecution(
    prompt: Prompt,
    response: ChatResponse,
  ): Observable<ChatResponse> {
    const options = prompt.options;
    assert(options != null, "ChatOptions must not be null");

    if (
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        options,
        response,
      )
    ) {
      return from(
        this._toolCallingManager.executeToolCalls(prompt, response),
      ).pipe(
        mergeMap((toolExecutionResult) => {
          if (toolExecutionResult.returnDirect()) {
            return of(
              ChatResponse.builder()
                .from(response)
                .generations(
                  ToolExecutionResult.buildGenerations(toolExecutionResult),
                )
                .build(),
            );
          }
          return this.internalStream(
            new Prompt(toolExecutionResult.conversationHistory(), options),
            response,
          );
        }),
      );
    }

    return of(response);
  }

  private toChatResponse(
    ollamaResponse: OllamaApi.ChatResponse,
    previousChatResponse: ChatResponse | null,
    includeThinkingMetadataWithoutEvalCount: boolean,
  ): ChatResponse {
    const message = ollamaResponse.message;
    const toolCalls =
      message?.tool_calls?.map((toolCall) => ({
        id: toolCall.id ?? "",
        type: "function",
        name: toolCall.function.name,
        arguments: JSON.stringify(toolCall.function.arguments),
      })) ?? [];

    const assistantMessage = new AssistantMessage({
      content: message?.content ?? "",
      properties: {},
      toolCalls,
    });

    let generationMetadata = ChatGenerationMetadata.NULL;
    const hasEvalCount =
      ollamaResponse.prompt_eval_count != null &&
      ollamaResponse.eval_count != null;
    const thinking = message?.thinking ?? null;
    if (
      hasEvalCount ||
      (includeThinkingMetadataWithoutEvalCount && thinking != null)
    ) {
      const builder = ChatGenerationMetadata.builder();
      if (hasEvalCount) {
        builder.finishReason(ollamaResponse.done_reason ?? null);
      }
      if (thinking != null) {
        builder.metadata(OllamaChatModel.THINKING_METADATA_KEY, thinking);
      }
      generationMetadata = builder.build();
    }

    return new ChatResponse({
      generations: [
        new Generation({
          assistantMessage,
          chatGenerationMetadata: generationMetadata,
        }),
      ],
      chatResponseMetadata: OllamaChatModel.from(
        ollamaResponse,
        previousChatResponse,
      ),
    });
  }

  private static getDefaultUsage(
    response: OllamaApi.ChatResponse,
  ): DefaultUsage {
    return new DefaultUsage({
      promptTokens: response.prompt_eval_count ?? 0,
      completionTokens: response.eval_count ?? 0,
      nativeUsage: response,
    });
  }

  private fromMediaData(mediaData: unknown): string {
    if (Buffer.isBuffer(mediaData)) {
      return mediaData.toString("base64");
    }
    if (mediaData instanceof Uint8Array) {
      return Buffer.from(mediaData).toString("base64");
    }
    if (typeof mediaData === "string") {
      return mediaData;
    }
    const typeName =
      mediaData == null
        ? "null"
        : (mediaData.constructor?.name ?? typeof mediaData);
    throw new Error(`Unsupported media data type: ${typeName}`);
  }

  private getTools(
    toolDefinitions: ToolDefinition[],
  ): OllamaApi.ChatRequest.Tool[] {
    return toolDefinitions.map((toolDefinition) => ({
      type: OllamaApi.ChatRequest.Tool.Type.FUNCTION,
      function: {
        name: toolDefinition.name,
        description: toolDefinition.description,
        parameters: JSON.parse(toolDefinition.inputSchema) as Record<
          string,
          unknown
        >,
      },
    }));
  }

  private async initializeModel(
    model: string,
    pullModelStrategy: PullModelStrategy | null,
  ): Promise<void> {
    if (
      pullModelStrategy != null &&
      pullModelStrategy !== PullModelStrategy.NEVER
    ) {
      await this._modelManager.pullModel(model, pullModelStrategy);
    }
  }
}
