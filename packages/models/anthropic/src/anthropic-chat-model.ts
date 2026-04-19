/*
 * Copyright 2026-present the original author or authors.
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

import type { Anthropic } from "@anthropic-ai/sdk";
import type {
  Message as AnthropicMessage,
  Usage as AnthropicUsage,
  Base64ImageSource,
  CacheControlEphemeral,
  CitationCharLocation,
  CitationContentBlockLocation,
  CitationPageLocation,
  CitationsDelta,
  CitationsWebSearchResultLocation,
  CodeExecutionTool20260120,
  ContentBlockParam,
  DocumentBlockParam,
  ImageBlockParam,
  MessageCreateParams,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  RawMessageStreamEvent,
  RedactedThinkingBlock,
  TextBlock,
  TextBlockParam,
  TextCitation,
  ThinkingBlock,
  Tool,
  ToolChoice,
  ToolResultBlockParam,
  ToolUnion,
  ToolUseBlockParam,
  UserLocation,
  WebSearchResultBlock,
  WebSearchTool20260209,
  WebSearchToolResultBlock,
} from "@anthropic-ai/sdk/resources/messages";
import {
  type Logger,
  LoggerFactory,
  type Media,
  MediaFormat,
  type MimeType,
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
  MessageAggregator,
  MessageType,
  Prompt,
  type Message as SpringMessage,
  type ToolCall,
  ToolCallingChatOptions,
  type ToolCallingManager,
  type ToolDefinition,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  type Usage,
  UsageCalculator,
  type UserMessage,
} from "@nestjs-ai/model";
import { defer, EMPTY, from, Observable, of, switchMap } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

import { AnthropicChatOptions } from "./anthropic-chat-options";
import { toSdkServiceTier } from "./anthropic-service-tier";
import { AnthropicSetup } from "./anthropic-setup";
import type { AnthropicSkillContainer } from "./anthropic-skill-container";
import type { AnthropicWebSearchResult } from "./anthropic-web-search-result";
import type { AnthropicWebSearchTool } from "./anthropic-web-search-tool";
import { CacheEligibilityResolver } from "./cache-eligibility-resolver";
import { Citation } from "./citation";

const ANTHROPIC_PROVIDER_NAME = "anthropic";

const BETA_SKILLS = "skills-2025-10-02";
const BETA_CODE_EXECUTION = "code-execution-2025-08-25";
const BETA_FILES_API = "files-api-2025-04-14";

export interface AnthropicChatModelProps {
  anthropicClient?: Anthropic;
  defaultOptions?: AnthropicChatOptions;
  toolCallingManager?: ToolCallingManager;
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate;
  observationRegistry?: ObservationRegistry;
}

/**
 * {@link ChatModel} implementation using the official Anthropic TypeScript SDK.
 *
 * Supports synchronous and streaming completions, tool calling, and observability.
 * API credentials are auto-detected from `ANTHROPIC_API_KEY` if not configured.
 *
 * @see AnthropicChatOptions
 * @see {@link https://docs.anthropic.com/en/api/messages Anthropic Messages API}
 */
export class AnthropicChatModel extends ChatModel {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  private static readonly DEFAULT_TOOL_CALLING_MANAGER =
    new DefaultToolCallingManager();

  private readonly logger: Logger = LoggerFactory.getLogger(
    AnthropicChatModel.name,
  );

  private readonly _anthropicClient: Anthropic;
  private readonly _options: AnthropicChatOptions;
  private readonly _toolCallingManager: ToolCallingManager;
  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: ChatModelObservationConvention =
    AnthropicChatModel.DEFAULT_OBSERVATION_CONVENTION;

  constructor(props: AnthropicChatModelProps = {}) {
    super();

    this._options =
      props.defaultOptions ??
      AnthropicChatOptions.builder()
        .model(AnthropicChatOptions.DEFAULT_MODEL)
        .maxTokens(AnthropicChatOptions.DEFAULT_MAX_TOKENS)
        .build();

    this._anthropicClient =
      props.anthropicClient ??
      AnthropicSetup.setupClient({
        baseUrl: this._options.baseUrl,
        apiKey: this._options.apiKey,
        timeout: this._options.timeout,
        maxRetries: this._options.maxRetries,
        fetch: this._options.fetch,
        fetchOptions: this._options.fetchOptions,
        customHeaders: this._options.customHeaders,
      });

    this._toolCallingManager =
      props.toolCallingManager ??
      AnthropicChatModel.DEFAULT_TOOL_CALLING_MANAGER;
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate();
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  static builder(): AnthropicChatModelBuilder {
    return new AnthropicChatModelBuilder();
  }

  /**
   * Gets the chat options for this model.
   */
  get options(): AnthropicChatOptions {
    return this._options;
  }

  /**
   * Returns the underlying Anthropic SDK client. Useful for accessing SDK features
   * directly, such as the Files API (`client.beta.files`).
   */
  get anthropicClient(): Anthropic {
    return this._anthropicClient;
  }

  override get defaultOptions(): ChatOptions {
    return this._options.copy();
  }

  setObservationConvention(
    observationConvention: ChatModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  protected async callPrompt(prompt: Prompt): Promise<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalCall(requestPrompt, null);
  }

  private async internalCall(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Promise<ChatResponse> {
    const request: MessageCreateParamsNonStreaming = {
      ...this.createRequest(prompt, false),
      stream: false,
    };

    const observationContext = new ChatModelObservationContext(
      prompt,
      ANTHROPIC_PROVIDER_NAME,
    );

    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      AnthropicChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    const response = await observation.observe(async () => {
      const message = await this._anthropicClient.messages.create(request);

      if (message.content.length === 0) {
        this.logger.warn(`No content blocks returned for prompt: ${prompt}`);
        return new ChatResponse({ generations: [] });
      }

      const citations: Citation[] = [];
      const webSearchResults: AnthropicWebSearchResult[] = [];
      const generations = this.buildGenerations(
        message,
        citations,
        webSearchResults,
      );

      const currentUsage = this.getDefaultUsage(message.usage);
      const accumulatedUsage = UsageCalculator.getCumulativeUsage(
        currentUsage,
        previousChatResponse,
      );

      const chatResponse = new ChatResponse({
        generations,
        chatResponseMetadata: this.fromMessage(
          message,
          accumulatedUsage,
          citations,
          webSearchResults,
        ),
      });

      observationContext.setResponse(chatResponse);
      return chatResponse;
    });

    const promptOptions = prompt.options;
    if (
      promptOptions != null &&
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        promptOptions,
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
        new Prompt(toolExecutionResult.conversationHistory(), promptOptions),
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
      const baseRequest = this.createRequest(prompt, true);
      const request: MessageCreateParamsStreaming = {
        ...baseRequest,
        stream: true,
      };

      const observationContext = new ChatModelObservationContext(
        prompt,
        ANTHROPIC_PROVIDER_NAME,
      );

      const observation = new ChatModelObservationDocumentation().observation(
        this._observationConvention,
        AnthropicChatModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );

      const streamingState = new StreamingState();

      const events$ = from(this._anthropicClient.messages.create(request)).pipe(
        mergeMap(
          (stream) =>
            new Observable<RawMessageStreamEvent>((subscriber) => {
              (async () => {
                try {
                  for await (const event of stream) {
                    subscriber.next(event);
                  }
                  subscriber.complete();
                } catch (error) {
                  subscriber.error(error);
                }
              })();
            }),
        ),
      );

      const chatResponse$ = events$.pipe(
        map((event) =>
          this.convertStreamEventToChatResponse(
            event,
            previousChatResponse,
            streamingState,
          ),
        ),
        mergeMap((response) => (response != null ? of(response) : EMPTY)),
      );

      const promptOptions = prompt.options;

      const flux = chatResponse$.pipe(
        switchMap((response) => {
          if (
            promptOptions != null &&
            this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
              promptOptions,
              response,
            )
          ) {
            // Only execute tools when the model's turn is complete and its stated
            // reason for stopping is that it wants to use a tool.
            if (response.hasFinishReasons("tool_use")) {
              return from(
                this._toolCallingManager.executeToolCalls(prompt, response),
              ).pipe(
                switchMap((toolExecutionResult) => {
                  if (toolExecutionResult.returnDirect()) {
                    // Return tool execution result directly to the client
                    return of(
                      ChatResponse.builder()
                        .from(response)
                        .generations(
                          ToolExecutionResult.buildGenerations(
                            toolExecutionResult,
                          ),
                        )
                        .build(),
                    );
                  }
                  // RECURSIVE CALL: Return a *new stream* by calling internalStream
                  // again. The new prompt contains the full history, including the
                  // tool results.
                  return this.internalStream(
                    new Prompt(
                      toolExecutionResult.conversationHistory(),
                      promptOptions,
                    ),
                    response,
                  );
                }),
              );
            }
            // Tool execution required but not at tool_use finish - skip this response
            return EMPTY;
          }
          // No tool execution needed - pass through the response
          return of(response);
        }),
      );

      return observation.observeStream(() =>
        new MessageAggregator().aggregate(flux, (chatResponse) => {
          observationContext.setResponse(chatResponse);
        }),
      );
    });
  }

  /**
   * Converts a streaming event to a ChatResponse. Handles message_start, content_block
   * events (text and tool_use), and message_delta for final response with usage.
   */
  private convertStreamEventToChatResponse(
    event: RawMessageStreamEvent,
    previousChatResponse: ChatResponse | null,
    streamingState: StreamingState,
  ): ChatResponse | null {
    // -- Event: message_start --
    // Captures message ID, model, and input tokens from the first event.
    if (event.type === "message_start") {
      streamingState.setMessageInfo(
        event.message.id,
        event.message.model,
        event.message.usage.input_tokens,
      );
      return null;
    }

    // -- Event: content_block_start --
    // Initializes tool call tracking or emits redacted thinking blocks.
    if (event.type === "content_block_start") {
      const contentBlock = event.content_block;
      if (contentBlock.type === "tool_use") {
        streamingState.startToolUse(contentBlock.id, contentBlock.name);
      } else if (contentBlock.type === "redacted_thinking") {
        // Emit redacted thinking block immediately
        const assistantMessage = new AssistantMessage({
          properties: { data: contentBlock.data },
        });
        return new ChatResponse({
          generations: [new Generation({ assistantMessage })],
        });
      } else if (contentBlock.type === "web_search_tool_result") {
        // Accumulate web search results for final response metadata
        const result = contentBlock.content;
        if (Array.isArray(result)) {
          for (const r of result as WebSearchResultBlock[]) {
            streamingState.addWebSearchResult({
              title: r.title,
              url: r.url,
              pageAge: r.page_age ?? null,
            });
          }
        }
      }
      return null;
    }

    // -- Event: content_block_delta --
    // Handles incremental text, tool argument JSON, thinking, and citation deltas.
    if (event.type === "content_block_delta") {
      const delta = event.delta;

      // Text chunk — emit immediately
      if (delta.type === "text_delta") {
        const assistantMessage = new AssistantMessage({ content: delta.text });
        return new ChatResponse({
          generations: [new Generation({ assistantMessage })],
        });
      }

      // Tool argument JSON chunk — accumulate for later
      if (delta.type === "input_json_delta") {
        streamingState.appendToolJson(delta.partial_json);
        return null;
      }

      // Thinking chunk — emit with thinking metadata
      if (delta.type === "thinking_delta") {
        const assistantMessage = new AssistantMessage({
          content: delta.thinking,
          properties: { thinking: true },
        });
        return new ChatResponse({
          generations: [new Generation({ assistantMessage })],
        });
      }

      // Thinking signature — emit with signature metadata
      if (delta.type === "signature_delta") {
        const assistantMessage = new AssistantMessage({
          properties: { signature: delta.signature },
        });
        return new ChatResponse({
          generations: [new Generation({ assistantMessage })],
        });
      }

      // Citation — accumulate for final response metadata
      if (delta.type === "citations_delta") {
        const citation = this.convertStreamingCitation(
          (delta as CitationsDelta).citation,
        );
        if (citation != null) {
          streamingState.addCitation(citation);
        }
        return null;
      }
    }

    // -- Event: content_block_stop --
    // Finalizes the current tool call if one was being tracked.
    if (event.type === "content_block_stop") {
      if (streamingState.isTrackingToolUse()) {
        streamingState.finishToolUse();
      }
      return null;
    }

    // -- Event: message_delta --
    // Final event with stop_reason and usage. Triggers tool execution if needed.
    if (event.type === "message_delta") {
      const stopReason = event.delta.stop_reason ?? "";
      const metadata = ChatGenerationMetadata.builder()
        .finishReason(stopReason)
        .build();

      const toolCalls = streamingState.getCompletedToolCalls();
      const assistantMessage = new AssistantMessage({
        content: "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });

      const generation = new Generation({
        assistantMessage,
        chatGenerationMetadata: metadata,
      });

      // Combine input tokens from message_start with output tokens from
      // message_delta
      const inputTokens = streamingState.getInputTokens();
      const outputTokens = event.usage.output_tokens;
      const usage = new DefaultUsage({
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        nativeUsage: event.usage,
      });

      const accumulatedUsage = UsageCalculator.getCumulativeUsage(
        usage,
        previousChatResponse,
      );

      const metadataBuilder = ChatResponseMetadata.builder()
        .id(streamingState.getMessageId())
        .model(streamingState.getModel())
        .usage(accumulatedUsage);

      const citations = streamingState.getCitations();
      if (citations.length > 0) {
        metadataBuilder
          .keyValue("citations", citations)
          .keyValue("citationCount", citations.length);
      }

      const webSearchResults = streamingState.getWebSearchResults();
      if (webSearchResults.length > 0) {
        metadataBuilder.keyValue("web-search-results", webSearchResults);
      }

      return new ChatResponse({
        generations: [generation],
        chatResponseMetadata: metadataBuilder.build(),
      });
    }

    return null;
  }

  buildRequestPrompt(prompt: Prompt): Prompt {
    const runtimeOptions =
      prompt.options instanceof AnthropicChatOptions
        ? prompt.options
        : this._options;

    ToolCallingChatOptions.validateToolCallbacks(runtimeOptions.toolCallbacks);

    return new Prompt(prompt.instructions, runtimeOptions);
  }

  /**
   * Creates a {@link MessageCreateParams} request from a {@link Prompt}. Maps message
   * types to Anthropic format: TOOL messages become user messages with
   * {@link ToolResultBlockParam}, and ASSISTANT messages with tool calls become
   * {@link ToolUseBlockParam} blocks.
   */
  createRequest(prompt: Prompt, _stream: boolean): MessageCreateParams {
    const requestOptions =
      prompt.options instanceof AnthropicChatOptions
        ? prompt.options
        : AnthropicChatOptions.builder().build();

    const model = requestOptions.model ?? AnthropicChatOptions.DEFAULT_MODEL;
    const maxTokens =
      requestOptions.maxTokens ?? AnthropicChatOptions.DEFAULT_MAX_TOKENS;

    const cacheResolver = CacheEligibilityResolver.from(
      requestOptions.cacheOptions,
    );

    const citationDocuments = requestOptions.citationDocuments;
    let citationDocsAdded = false;

    // Collect system messages and non-system messages separately
    const systemTexts: string[] = [];
    const nonSystemMessages: SpringMessage[] = [];
    for (const message of prompt.instructions) {
      if (message.messageType === MessageType.SYSTEM) {
        const text = message.text;
        if (text != null) {
          systemTexts.push(text);
        }
      } else {
        nonSystemMessages.push(message);
      }
    }

    let system: string | TextBlockParam[] | undefined;

    if (systemTexts.length > 0) {
      if (!cacheResolver.isCachingEnabled()) {
        // No caching: join all system texts and use simple string format
        system = systemTexts.join("\n\n");
      } else if (
        requestOptions.cacheOptions.multiBlockSystemCaching &&
        systemTexts.length > 1
      ) {
        // Multi-block system caching: each text becomes a separate
        // TextBlockParam. Cache control is applied to the second-to-last block.
        const systemBlocks: TextBlockParam[] = [];
        for (let i = 0; i < systemTexts.length; i++) {
          const block: TextBlockParam = { type: "text", text: systemTexts[i] };
          if (i === systemTexts.length - 2) {
            const cacheControl = cacheResolver.resolve(
              MessageType.SYSTEM,
              systemTexts.join("\n\n"),
            );
            if (cacheControl != null) {
              block.cache_control = cacheControl;
              cacheResolver.useCacheBlock();
            }
          }
          systemBlocks.push(block);
        }
        system = systemBlocks;
      } else {
        // Single-block system caching: join all texts into one TextBlockParam
        const joinedText = systemTexts.join("\n\n");
        const cacheControl = cacheResolver.resolve(
          MessageType.SYSTEM,
          joinedText,
        );
        if (cacheControl != null) {
          system = [
            { type: "text", text: joinedText, cache_control: cacheControl },
          ];
          cacheResolver.useCacheBlock();
        } else {
          system = joinedText;
        }
      }
    }

    // Pre-compute last user message index for CONVERSATION_HISTORY strategy
    let lastUserIndex = -1;
    if (cacheResolver.isCachingEnabled()) {
      for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
        if (nonSystemMessages[i].messageType === MessageType.USER) {
          lastUserIndex = i;
          break;
        }
      }
    }

    const messages: MessageParam[] = [];

    for (let i = 0; i < nonSystemMessages.length; i++) {
      const message = nonSystemMessages[i];

      if (message.messageType === MessageType.USER) {
        const userMessage = message as UserMessage;
        const hasCitationDocs =
          !citationDocsAdded && citationDocuments.length > 0;
        const hasMedia =
          userMessage.media != null && userMessage.media.length > 0;
        const isLastUserMessage = i === lastUserIndex;
        const applyCacheToUser =
          isLastUserMessage && cacheResolver.isCachingEnabled();

        let userCacheControl: CacheControlEphemeral | null = null;
        if (applyCacheToUser) {
          const combinedText = this.combineEligibleMessagesText(
            nonSystemMessages,
            lastUserIndex,
          );
          userCacheControl = cacheResolver.resolve(
            MessageType.USER,
            combinedText,
          );
        }

        if (hasCitationDocs || hasMedia || userCacheControl != null) {
          const contentBlocks: ContentBlockParam[] = [];

          // Prepend citation document blocks to the first user message
          if (hasCitationDocs) {
            for (const doc of citationDocuments) {
              contentBlocks.push(doc.toDocumentBlockParam());
            }
            citationDocsAdded = true;
          }

          const text = userMessage.text;
          if (text != null && text.length > 0) {
            const textBlock: TextBlockParam = { type: "text", text };
            if (userCacheControl != null) {
              textBlock.cache_control = userCacheControl;
              cacheResolver.useCacheBlock();
            }
            contentBlocks.push(textBlock);
          }

          if (hasMedia) {
            for (const media of userMessage.media) {
              contentBlocks.push(this.getContentBlockParamByMedia(media));
            }
          }

          messages.push({ role: "user", content: contentBlocks });
        } else {
          const text = message.text;
          if (text != null) {
            messages.push({ role: "user", content: text });
          }
        }
      } else if (message.messageType === MessageType.ASSISTANT) {
        const assistantMessage = message as AssistantMessage;
        if (assistantMessage.toolCalls.length > 0) {
          const toolUseBlocks: ContentBlockParam[] =
            assistantMessage.toolCalls.map((toolCall) => {
              const block: ToolUseBlockParam = {
                type: "tool_use",
                id: toolCall.id,
                name: toolCall.name,
                input: this.buildToolInput(toolCall.arguments),
              };
              return block;
            });
          messages.push({ role: "assistant", content: toolUseBlocks });
        } else {
          const text = message.text;
          if (text != null) {
            messages.push({ role: "assistant", content: text });
          }
        }
      } else if (message.messageType === MessageType.TOOL) {
        const toolResponseMessage = message as ToolResponseMessage;
        const toolResultBlocks: ContentBlockParam[] =
          toolResponseMessage.responses.map((response) => {
            const block: ToolResultBlockParam = {
              type: "tool_result",
              tool_use_id: response.id ?? "",
              content: response.responseData,
            };
            return block;
          });
        messages.push({ role: "user", content: toolResultBlocks });
      }
    }

    const request: MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    if (system != null) {
      request.system = system;
    }
    if (requestOptions.temperature != null) {
      request.temperature = requestOptions.temperature;
    }
    if (requestOptions.topP != null) {
      request.top_p = requestOptions.topP;
    }
    if (requestOptions.topK != null) {
      request.top_k = requestOptions.topK;
    }
    if (
      requestOptions.stopSequences != null &&
      requestOptions.stopSequences.length > 0
    ) {
      request.stop_sequences = requestOptions.stopSequences;
    }
    if (requestOptions.metadata != null) {
      request.metadata = requestOptions.metadata;
    }
    if (requestOptions.thinking != null) {
      request.thinking = requestOptions.thinking;
    }
    if (requestOptions.inferenceGeo != null) {
      request.inference_geo = requestOptions.inferenceGeo;
    }
    if (requestOptions.serviceTier != null) {
      request.service_tier = toSdkServiceTier(requestOptions.serviceTier);
    }
    if (requestOptions.outputConfig != null) {
      request.output_config = requestOptions.outputConfig;
    }

    // Build combined tool list (user-defined tools + built-in tools)
    const allTools: ToolUnion[] = [];

    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      let tools = toolDefinitions.map((td) => this.toAnthropicTool(td));

      // Apply cache control to the last tool if caching strategy includes tools
      const toolCacheControl = cacheResolver.resolveToolCacheControl();
      if (toolCacheControl != null && tools.length > 0) {
        const lastIndex = tools.length - 1;
        tools = tools.map((tool, idx) => {
          if (idx === lastIndex) {
            cacheResolver.useCacheBlock();
            return { ...tool, cache_control: toolCacheControl };
          }
          return tool;
        });
      }

      for (const tool of tools) {
        allTools.push(tool);
      }
    }

    // Add built-in web search tool if configured
    if (requestOptions.webSearchTool != null) {
      allTools.push(this.toSdkWebSearchTool(requestOptions.webSearchTool));
    }

    if (allTools.length > 0) {
      request.tools = allTools;

      // Set tool choice if specified, applying disableParallelToolUse if set
      if (requestOptions.toolChoice != null) {
        let toolChoice = requestOptions.toolChoice;
        if (requestOptions.disableParallelToolUse === true) {
          toolChoice = this.applyDisableParallelToolUse(toolChoice);
        }
        request.tool_choice = toolChoice;
      } else if (requestOptions.disableParallelToolUse === true) {
        request.tool_choice = {
          type: "auto",
          disable_parallel_tool_use: true,
        };
      }
    }

    const skillContainer =
      requestOptions.skillContainer ?? this._options.skillContainer;

    if (skillContainer != null) {
      this.applySkillContainer(
        request,
        skillContainer,
        toolDefinitions,
        requestOptions.httpHeaders,
      );
    }

    return request;
  }

  private applySkillContainer(
    request: MessageCreateParams,
    skillContainer: AnthropicSkillContainer,
    toolDefinitions: ToolDefinition[],
    httpHeaders: Record<string, string>,
  ): void {
    const requestRecord = request as unknown as Record<string, unknown>;
    requestRecord.container = { skills: skillContainer.toSkillsList() };

    // Add code execution tool if not already present in user-defined tools
    const hasCodeExecution = toolDefinitions.some((td) =>
      td.name.includes("code_execution"),
    );
    if (!hasCodeExecution) {
      const codeExecutionTool: CodeExecutionTool20260120 = {
        type: "code_execution_20260120",
        name: "code_execution",
      };
      request.tools = [...(request.tools ?? []), codeExecutionTool];
    }

    // Add beta headers, merging with any existing anthropic-beta value
    const existingBeta = httpHeaders["anthropic-beta"];
    const betaParts = [BETA_SKILLS, BETA_CODE_EXECUTION, BETA_FILES_API];
    let merged = existingBeta ?? "";
    for (const part of betaParts) {
      if (!merged.includes(part)) {
        merged = merged.length > 0 ? `${merged},${part}` : part;
      }
    }
    requestRecord["anthropic-beta"] = merged;
  }

  /**
   * Combines text from all messages up to and including the specified index, for use
   * in cache eligibility length checks during CONVERSATION_HISTORY caching.
   */
  private combineEligibleMessagesText(
    messages: SpringMessage[],
    lastUserIndex: number,
  ): string {
    let combined = "";
    for (let i = 0; i <= lastUserIndex && i < messages.length; i++) {
      const text = messages[i].text;
      if (text != null) {
        combined += text;
      }
    }
    return combined;
  }

  /**
   * Builds generations from the Anthropic message response. Extracts text, tool
   * calls, thinking content, and citations from the response content blocks.
   */
  private buildGenerations(
    message: AnthropicMessage,
    citationAccumulator: Citation[],
    webSearchAccumulator: AnthropicWebSearchResult[],
  ): Generation[] {
    const generations: Generation[] = [];

    const finishReason = message.stop_reason ?? "";
    const generationMetadata = ChatGenerationMetadata.builder()
      .finishReason(finishReason)
      .build();

    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const block of message.content) {
      if (block.type === "text") {
        const textBlock = block as TextBlock;
        textContent += textBlock.text;

        if (textBlock.citations != null) {
          for (const tc of textBlock.citations) {
            const citation = this.convertTextCitation(tc);
            if (citation != null) {
              citationAccumulator.push(citation);
            }
          }
        }
      } else if (block.type === "tool_use") {
        const args = block.input != null ? JSON.stringify(block.input) : "{}";
        toolCalls.push({
          id: block.id,
          type: "function",
          name: block.name,
          arguments: args,
        });
      } else if (block.type === "thinking") {
        // ThinkingBlock: stored as a separate Generation with the thinking text as
        // content and signature in metadata properties.
        const thinkingBlock = block as ThinkingBlock;
        generations.push(
          new Generation({
            assistantMessage: new AssistantMessage({
              content: thinkingBlock.thinking,
              properties: { signature: thinkingBlock.signature },
            }),
            chatGenerationMetadata: generationMetadata,
          }),
        );
      } else if (block.type === "redacted_thinking") {
        // RedactedThinkingBlock: safety-redacted reasoning with a data marker.
        const redactedBlock = block as RedactedThinkingBlock;
        generations.push(
          new Generation({
            assistantMessage: new AssistantMessage({
              properties: { data: redactedBlock.data },
            }),
            chatGenerationMetadata: generationMetadata,
          }),
        );
      } else if (block.type === "web_search_tool_result") {
        const wsBlock = block as WebSearchToolResultBlock;
        if (Array.isArray(wsBlock.content)) {
          for (const r of wsBlock.content as WebSearchResultBlock[]) {
            webSearchAccumulator.push({
              title: r.title,
              url: r.url,
              pageAge: r.page_age ?? null,
            });
          }
        }
      } else if (
        block.type === "container_upload" ||
        block.type === "server_tool_use" ||
        block.type === "bash_code_execution_tool_result" ||
        block.type === "text_editor_code_execution_tool_result" ||
        block.type === "code_execution_tool_result"
      ) {
        this.logger.warn(`Unsupported content block type: ${block.type}`);
      }
    }

    generations.push(
      new Generation({
        assistantMessage: new AssistantMessage({
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }),
        chatGenerationMetadata: generationMetadata,
      }),
    );

    return generations;
  }

  /**
   * Creates chat response metadata from the Anthropic message.
   */
  private fromMessage(
    message: AnthropicMessage,
    usage: Usage,
    citations: Citation[],
    webSearchResults: AnthropicWebSearchResult[],
  ): ChatResponseMetadata {
    assert(message != null, "Anthropic Message must not be null");
    const builder = ChatResponseMetadata.builder()
      .id(message.id)
      .usage(usage)
      .model(message.model)
      .keyValue("anthropic-response", message);
    if (citations.length > 0) {
      builder
        .keyValue("citations", citations)
        .keyValue("citationCount", citations.length);
    }
    if (webSearchResults.length > 0) {
      builder.keyValue("web-search-results", webSearchResults);
    }
    return builder.build();
  }

  /**
   * Converts Anthropic SDK usage to the Spring AI usage shape.
   */
  private getDefaultUsage(usage: AnthropicUsage | null | undefined): Usage {
    if (usage == null) {
      return new EmptyUsage();
    }
    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;
    return new DefaultUsage({
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      nativeUsage: usage,
    });
  }

  private convertTextCitation(textCitation: TextCitation): Citation | null {
    switch (textCitation.type) {
      case "char_location":
        return this.fromCharLocation(textCitation as CitationCharLocation);
      case "page_location":
        return this.fromPageLocation(textCitation as CitationPageLocation);
      case "content_block_location":
        return this.fromContentBlockLocation(
          textCitation as CitationContentBlockLocation,
        );
      case "web_search_result_location":
        return this.fromWebSearchResultLocation(
          textCitation as CitationsWebSearchResultLocation,
        );
      default:
        return null;
    }
  }

  private convertStreamingCitation(
    citation: CitationsDelta["citation"],
  ): Citation | null {
    switch (citation.type) {
      case "char_location":
        return this.fromCharLocation(citation as CitationCharLocation);
      case "page_location":
        return this.fromPageLocation(citation as CitationPageLocation);
      case "content_block_location":
        return this.fromContentBlockLocation(
          citation as CitationContentBlockLocation,
        );
      case "web_search_result_location":
        return this.fromWebSearchResultLocation(
          citation as CitationsWebSearchResultLocation,
        );
      default:
        return null;
    }
  }

  private fromCharLocation(loc: CitationCharLocation): Citation {
    return Citation.ofCharLocation(
      loc.cited_text,
      loc.document_index,
      loc.document_title ?? null,
      loc.start_char_index,
      loc.end_char_index,
    );
  }

  private fromPageLocation(loc: CitationPageLocation): Citation {
    return Citation.ofPageLocation(
      loc.cited_text,
      loc.document_index,
      loc.document_title ?? null,
      loc.start_page_number,
      loc.end_page_number,
    );
  }

  private fromContentBlockLocation(
    loc: CitationContentBlockLocation,
  ): Citation {
    return Citation.ofContentBlockLocation(
      loc.cited_text,
      loc.document_index,
      loc.document_title ?? null,
      loc.start_block_index,
      loc.end_block_index,
    );
  }

  private fromWebSearchResultLocation(
    loc: CitationsWebSearchResultLocation,
  ): Citation {
    return Citation.ofWebSearchResultLocation(
      loc.cited_text,
      loc.url,
      loc.title ?? null,
    );
  }

  /**
   * Builds a tool input value from a JSON arguments string. When rebuilding
   * conversation history, we need to include the tool call arguments that were
   * originally sent by the model.
   */
  private buildToolInput(argumentsJson: string): unknown {
    if (argumentsJson == null || argumentsJson.length === 0) {
      return {};
    }
    try {
      return JSON.parse(argumentsJson);
    } catch (error) {
      this.logger.warn(
        `Failed to parse tool arguments JSON: ${argumentsJson}`,
        error,
      );
      return {};
    }
  }

  /**
   * Converts a {@link ToolDefinition} to an Anthropic SDK {@link Tool}. The schema
   * JSON string is parsed into an input schema object.
   */
  private toAnthropicTool(toolDefinition: ToolDefinition): Tool {
    let schema: { properties?: Record<string, unknown>; required?: string[] };
    try {
      schema = JSON.parse(toolDefinition.inputSchema);
    } catch (error) {
      throw new Error(
        `Failed to parse tool input schema: ${toolDefinition.inputSchema}`,
        { cause: error },
      );
    }

    const inputSchema: Tool.InputSchema = {
      type: "object",
      properties: schema.properties ?? {},
    };
    if (Array.isArray(schema.required)) {
      inputSchema.required = schema.required;
    }

    return {
      name: toolDefinition.name,
      description: toolDefinition.description,
      input_schema: inputSchema,
    };
  }

  /**
   * Converts an {@link AnthropicWebSearchTool} to the Anthropic SDK's
   * {@link WebSearchTool20260209}.
   */
  private toSdkWebSearchTool(
    webSearchTool: AnthropicWebSearchTool,
  ): WebSearchTool20260209 {
    const sdkTool: WebSearchTool20260209 = {
      type: "web_search_20260209",
      name: "web_search",
    };
    if (webSearchTool.allowedDomains != null) {
      sdkTool.allowed_domains = [...webSearchTool.allowedDomains];
    }
    if (webSearchTool.blockedDomains != null) {
      sdkTool.blocked_domains = [...webSearchTool.blockedDomains];
    }
    if (webSearchTool.maxUses != null) {
      sdkTool.max_uses = webSearchTool.maxUses;
    }
    if (webSearchTool.userLocation != null) {
      const loc = webSearchTool.userLocation;
      const userLocation: UserLocation = { type: "approximate" };
      if (loc.city != null) userLocation.city = loc.city;
      if (loc.country != null) userLocation.country = loc.country;
      if (loc.region != null) userLocation.region = loc.region;
      if (loc.timezone != null) userLocation.timezone = loc.timezone;
      sdkTool.user_location = userLocation;
    }
    return sdkTool;
  }

  /**
   * Converts a {@link Media} object to an Anthropic SDK {@link ContentBlockParam}.
   * Supports images (PNG, JPEG, GIF, WebP) and PDF documents.
   */
  private getContentBlockParamByMedia(media: Media): ContentBlockParam {
    const mimeType = media.mimeType;
    const data = this.fromMediaData(media.data);

    if (this.isImageMedia(mimeType)) {
      return this.createImageBlockParam(mimeType, data);
    }
    if (this.isPdfMedia(mimeType)) {
      return this.createDocumentBlockParam(data);
    }
    throw new Error(
      `Unsupported media type: ${mimeType}. Supported types are: images (image/*) and PDF documents (application/pdf)`,
    );
  }

  private isImageMedia(mimeType: MimeType): boolean {
    return mimeType.startsWith("image/");
  }

  private isPdfMedia(mimeType: MimeType): boolean {
    return mimeType === MediaFormat.DOC_PDF;
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
    throw new Error(
      `Unsupported media data type: ${typeof mediaData}. Expected Buffer/Uint8Array or string.`,
    );
  }

  private createImageBlockParam(
    mimeType: MimeType,
    data: string,
  ): ImageBlockParam {
    const source: ImageBlockParam["source"] = data.startsWith("https://")
      ? { type: "url", url: data }
      : ({
          type: "base64",
          media_type: this.toSdkImageMediaType(mimeType),
          data,
        } satisfies Base64ImageSource);
    return { type: "image", source };
  }

  private createDocumentBlockParam(data: string): DocumentBlockParam {
    const source: DocumentBlockParam["source"] = data.startsWith("https://")
      ? { type: "url", url: data }
      : { type: "base64", media_type: "application/pdf", data };
    return { type: "document", source };
  }

  private toSdkImageMediaType(
    mimeType: MimeType,
  ): Base64ImageSource["media_type"] {
    switch (mimeType) {
      case MediaFormat.IMAGE_PNG:
        return "image/png";
      case MediaFormat.IMAGE_JPEG:
        return "image/jpeg";
      case MediaFormat.IMAGE_GIF:
        return "image/gif";
      case MediaFormat.IMAGE_WEBP:
        return "image/webp";
      default:
        throw new Error(
          `Unsupported image type: ${mimeType}. Supported types: image/png, image/jpeg, image/gif, image/webp`,
        );
    }
  }

  /**
   * Applies `disableParallelToolUse` to an existing {@link ToolChoice} by rebuilding
   * the appropriate subtype with the flag set to `true`.
   */
  private applyDisableParallelToolUse(toolChoice: ToolChoice): ToolChoice {
    if (toolChoice.type === "auto" || toolChoice.type === "any") {
      return { ...toolChoice, disable_parallel_tool_use: true };
    }
    if (toolChoice.type === "tool") {
      return { ...toolChoice, disable_parallel_tool_use: true };
    }
    return toolChoice;
  }
}

/**
 * Holds state accumulated during streaming for building complete responses. Tracks
 * message metadata (id, model, input tokens) and tool call accumulation state.
 */
class StreamingState {
  private _messageId = "";
  private _model = "";
  private _inputTokens = 0;

  private _currentToolId = "";
  private _currentToolName = "";
  private _currentToolJson = "";

  private readonly _completedToolCalls: ToolCall[] = [];
  private readonly _citations: Citation[] = [];
  private readonly _webSearchResults: AnthropicWebSearchResult[] = [];

  setMessageInfo(id: string, modelName: string, tokens: number): void {
    this._messageId = id;
    this._model = modelName;
    this._inputTokens = tokens;
  }

  getMessageId(): string {
    return this._messageId;
  }

  getModel(): string {
    return this._model;
  }

  getInputTokens(): number {
    return this._inputTokens;
  }

  startToolUse(toolId: string, toolName: string): void {
    this._currentToolId = toolId;
    this._currentToolName = toolName;
    this._currentToolJson = "";
  }

  appendToolJson(partialJson: string): void {
    this._currentToolJson += partialJson;
  }

  finishToolUse(): void {
    if (this._currentToolId.length > 0 && this._currentToolName.length > 0) {
      this._completedToolCalls.push({
        id: this._currentToolId,
        type: "function",
        name: this._currentToolName,
        arguments: this._currentToolJson,
      });
    }
    this._currentToolId = "";
    this._currentToolName = "";
    this._currentToolJson = "";
  }

  isTrackingToolUse(): boolean {
    return this._currentToolId.length > 0;
  }

  getCompletedToolCalls(): ToolCall[] {
    return [...this._completedToolCalls];
  }

  addCitation(citation: Citation): void {
    this._citations.push(citation);
  }

  getCitations(): Citation[] {
    return [...this._citations];
  }

  addWebSearchResult(result: AnthropicWebSearchResult): void {
    this._webSearchResults.push(result);
  }

  getWebSearchResults(): AnthropicWebSearchResult[] {
    return [...this._webSearchResults];
  }
}

/**
 * Builder for creating {@link AnthropicChatModel} instances.
 */
export class AnthropicChatModelBuilder {
  private _anthropicClient: Anthropic | null = null;
  private _options: AnthropicChatOptions | null = null;
  private _toolCallingManager: ToolCallingManager | null = null;
  private _observationRegistry: ObservationRegistry | null = null;
  private _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate | null =
    null;

  anthropicClient(anthropicClient: Anthropic): this {
    this._anthropicClient = anthropicClient;
    return this;
  }

  options(options: AnthropicChatOptions): this {
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
    predicate: ToolExecutionEligibilityPredicate,
  ): this {
    this._toolExecutionEligibilityPredicate = predicate;
    return this;
  }

  build(): AnthropicChatModel {
    return new AnthropicChatModel({
      anthropicClient: this._anthropicClient ?? undefined,
      defaultOptions: this._options ?? undefined,
      toolCallingManager: this._toolCallingManager ?? undefined,
      toolExecutionEligibilityPredicate:
        this._toolExecutionEligibilityPredicate ?? undefined,
      observationRegistry: this._observationRegistry ?? undefined,
    });
  }
}
