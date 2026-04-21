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
  ChatResponse,
  DefaultToolCallingManager,
  type Message,
  Prompt,
  type ToolCallingChatOptions,
  type ToolCallingManager,
  ToolExecutionResult,
} from "@nestjs-ai/model";
import { HIGHEST_PRECEDENCE, LOWEST_PRECEDENCE } from "@nestjs-port/core";
import type { Observable } from "rxjs";
import { concatWith, defer, EMPTY, filter, from, mergeMap, of } from "rxjs";

import { ChatClientMessageAggregator } from "../chat-client-message-aggregator";
import { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api";

export interface ToolCallAdvisorProps {
  toolCallingManager?: ToolCallingManager;
  advisorOrder?: number;
  conversationHistoryEnabled?: boolean;
  streamToolCallResponses?: boolean;
}

/**
 * Checks whether the supplied options support tool calling.
 *
 * @param options candidate prompt options
 * @returns true when the options are tool calling options
 */
function isToolCallingChatOptions(
  options: unknown,
): options is ToolCallingChatOptions {
  return (
    options != null &&
    typeof options === "object" &&
    "internalToolExecutionEnabled" in options
  );
}

/**
 * Recursive advisor that disables the internal tool execution flow and implements
 * the tool calling loop as part of the advisor chain.
 *
 * It enables intercepting the tool calling loop by the rest of the advisors next in
 * the chain.
 */
export class ToolCallAdvisor implements CallAdvisor, StreamAdvisor {
  static readonly DEFAULT_ADVISOR_ORDER = HIGHEST_PRECEDENCE + 300;

  protected readonly _toolCallingManager: ToolCallingManager;
  private readonly _advisorOrder: number;
  private readonly _conversationHistoryEnabled: boolean;
  private readonly _streamToolCallResponses: boolean;

  /**
   * Creates a tool call advisor with the provided configuration.
   *
   * @param props advisor configuration overrides
   */
  constructor(props: ToolCallAdvisorProps = {}) {
    const toolCallingManager =
      props.toolCallingManager === undefined
        ? new DefaultToolCallingManager()
        : props.toolCallingManager;
    assert(toolCallingManager, "toolCallingManager must not be null");

    const advisorOrder =
      props.advisorOrder ?? ToolCallAdvisor.DEFAULT_ADVISOR_ORDER;
    assert(
      advisorOrder > HIGHEST_PRECEDENCE && advisorOrder < LOWEST_PRECEDENCE,
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );

    this._toolCallingManager = toolCallingManager;
    this._advisorOrder = advisorOrder;
    this._conversationHistoryEnabled = props.conversationHistoryEnabled ?? true;
    this._streamToolCallResponses = props.streamToolCallResponses ?? false;
  }

  /**
   * Returns the advisor name used in chain diagnostics.
   */
  get name(): string {
    return "Tool Calling Advisor";
  }

  /**
   * Returns the advisor order.
   */
  get order(): number {
    return this._advisorOrder;
  }

  /**
   * Executes the non-streaming tool calling loop.
   *
   * @param chatClientRequest input chat request
   * @param callAdvisorChain advisor chain to invoke
   * @returns the final chat client response
   */
  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    assert(callAdvisorChain, "callAdvisorChain must not be null");
    assert(chatClientRequest, "chatClientRequest must not be null");

    const promptOptions = chatClientRequest.prompt.options;
    if (promptOptions == null || !isToolCallingChatOptions(promptOptions)) {
      throw new TypeError(
        "ToolCall Advisor requires ToolCallingChatOptions to be set in the ChatClientRequest options.",
      );
    }

    const initializedChatClientRequest = await this.doInitializeLoop(
      chatClientRequest,
      callAdvisorChain,
    );

    // Overwrite the ToolCallingChatOptions to disable internal tool execution.
    // Disable internal tool execution to allow ToolCallAdvisor to handle tool calls
    const optionsCopy = (
      promptOptions.mutate() as ToolCallingChatOptions.Builder
    )
      .internalToolExecutionEnabled(false)
      .build();

    let instructions = initializedChatClientRequest.prompt.instructions;

    let chatClientResponse: ChatClientResponse | null = null;

    let isToolCall = false;

    do {
      // Before Call
      let processedChatClientRequest = ChatClientRequest.builder()
        .prompt(new Prompt(instructions, optionsCopy))
        .context(initializedChatClientRequest.context)
        .build();

      // Next Call
      processedChatClientRequest = await this.doBeforeCall(
        processedChatClientRequest,
        callAdvisorChain,
      );

      chatClientResponse = await callAdvisorChain
        .copy(this)
        .nextCall(processedChatClientRequest);

      chatClientResponse = await this.doAfterCall(
        chatClientResponse,
        callAdvisorChain,
      );

      // After Call
      // TODO: check that this tool call detection is sufficient for all chat models
      // that support tool calls. (e.g. Anthropic and Bedrock are checking for
      // finish status as well)
      const chatResponse = chatClientResponse.chatResponse;
      isToolCall = chatResponse?.hasToolCalls() === true;

      if (isToolCall) {
        assert(
          chatResponse,
          "redundant check that should never fail, but here to help nullability checks",
        );

        const toolExecutionResult =
          await this._toolCallingManager.executeToolCalls(
            processedChatClientRequest.prompt,
            chatResponse,
          );

        if (toolExecutionResult.returnDirect()) {
          // Return tool execution result directly to the application client.
          chatClientResponse = chatClientResponse
            .mutate()
            .chatResponse(
              ChatResponse.builder()
                .from(chatResponse)
                .generations(
                  ToolExecutionResult.buildGenerations(toolExecutionResult),
                )
                .build(),
            )
            .build();

          // Interrupt the tool calling loop and return the tool execution result
          // directly to the client application instead of returning it to the LLM.
          break;
        }

        instructions = this.doGetNextInstructionsForToolCall(
          processedChatClientRequest,
          chatClientResponse,
          toolExecutionResult,
        );
      }
    } while (isToolCall); // loop until no tool calls are present

    assert(chatClientResponse != null, "chatClientResponse must not be null");
    return await this.doFinalizeLoop(chatClientResponse, callAdvisorChain);
  }

  /**
   * Determines the next prompt instructions after tool execution.
   *
   * @param chatClientRequest current chat request
   * @param _chatClientResponse current chat response
   * @param toolExecutionResult tool execution result
   * @returns the next instruction messages
   */
  protected doGetNextInstructionsForToolCall(
    chatClientRequest: ChatClientRequest,
    _chatClientResponse: ChatClientResponse,
    toolExecutionResult: ToolExecutionResult,
  ): Message[] {
    const conversationHistory = toolExecutionResult.conversationHistory();
    if (!this._conversationHistoryEnabled) {
      assert(
        conversationHistory.length > 0,
        "conversationHistory must contain at least one message",
      );
      return [
        chatClientRequest.prompt.systemMessage,
        conversationHistory[conversationHistory.length - 1],
      ];
    }

    return conversationHistory;
  }

  /**
   * Finalizes the non-streaming tool call loop.
   *
   * @param chatClientResponse final chat response
   * @param _callAdvisorChain advisor chain used during the loop
   * @returns the finalized response
   */
  protected async doFinalizeLoop(
    chatClientResponse: ChatClientResponse,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    return chatClientResponse;
  }

  /**
   * Initializes the non-streaming tool call loop.
   *
   * @param chatClientRequest input chat request
   * @param _callAdvisorChain advisor chain used during the loop
   * @returns the initialized request
   */
  protected async doInitializeLoop(
    chatClientRequest: ChatClientRequest,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  /**
   * Hook invoked before each non-streaming call.
   *
   * @param chatClientRequest current chat request
   * @param _callAdvisorChain advisor chain used during the loop
   * @returns the request to send downstream
   */
  protected async doBeforeCall(
    chatClientRequest: ChatClientRequest,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  /**
   * Hook invoked after each non-streaming call.
   *
   * @param chatClientResponse current chat response
   * @param _callAdvisorChain advisor chain used during the loop
   * @returns the response to continue processing
   */
  protected async doAfterCall(
    chatClientResponse: ChatClientResponse,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    return chatClientResponse;
  }

  /**
   * Executes the streaming tool calling loop.
   *
   * @param chatClientRequest input chat request
   * @param streamAdvisorChain advisor chain to invoke
   * @returns an observable of chat client responses
   */
  adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    assert(streamAdvisorChain, "streamAdvisorChain must not be null");
    assert(chatClientRequest, "chatClientRequest must not be null");

    const promptOptions = chatClientRequest.prompt.options;
    if (!isToolCallingChatOptions(promptOptions)) {
      throw new TypeError(
        "ToolCall Advisor requires ToolCallingChatOptions to be set in the ChatClientRequest options.",
      );
    }

    return from(
      this.doInitializeLoopStream(chatClientRequest, streamAdvisorChain),
    ).pipe(
      mergeMap((initializedRequest) => {
        // Overwrite the ToolCallingChatOptions to disable internal tool execution.
        const optionsCopy = (
          promptOptions.mutate() as ToolCallingChatOptions.Builder
        )
          .internalToolExecutionEnabled(false)
          .build();

        return this.internalStream(
          streamAdvisorChain,
          initializedRequest,
          optionsCopy,
          initializedRequest.prompt.instructions,
        );
      }),
    );
  }

  /**
   * Initializes the streaming tool call loop.
   *
   * @param chatClientRequest input chat request
   * @param _streamAdvisorChain advisor chain used during the loop
   * @returns the initialized request
   */
  protected async doInitializeLoopStream(
    chatClientRequest: ChatClientRequest,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  /**
   * Hook invoked before each streaming call.
   *
   * @param chatClientRequest current chat request
   * @param _streamAdvisorChain advisor chain used during the loop
   * @returns the request to send downstream
   */
  protected async doBeforeStream(
    chatClientRequest: ChatClientRequest,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  /**
   * Hook invoked after each streaming call.
   *
   * @param chatClientResponse current chat response
   * @param _streamAdvisorChain advisor chain used during the loop
   * @returns the response to continue processing
   */
  protected async doAfterStream(
    chatClientResponse: ChatClientResponse,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Promise<ChatClientResponse> {
    return chatClientResponse;
  }

  /**
   * Finalizes the streaming tool call loop.
   *
   * @param chatClientResponses response stream to finalize
   * @param _streamAdvisorChain advisor chain used during the loop
   * @returns the finalized response stream
   */
  protected doFinalizeLoopStream(
    chatClientResponses: Observable<ChatClientResponse>,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    return chatClientResponses;
  }

  /**
   * Determines the next streaming instructions after tool execution.
   *
   * @param chatClientRequest current chat request
   * @param _chatClientResponse current chat response
   * @param toolExecutionResult tool execution result
   * @returns the next instruction messages
   */
  protected doGetNextInstructionsForToolCallStream(
    chatClientRequest: ChatClientRequest,
    _chatClientResponse: ChatClientResponse,
    toolExecutionResult: ToolExecutionResult,
  ): Message[] {
    const conversationHistory = toolExecutionResult.conversationHistory();
    if (!this._conversationHistoryEnabled) {
      const lastConversationMessage =
        conversationHistory[conversationHistory.length - 1];
      return [
        chatClientRequest.prompt.systemMessage,
        lastConversationMessage ?? chatClientRequest.prompt.systemMessage,
      ];
    }

    return conversationHistory;
  }

  /**
   * Runs the recursive streaming loop for tool call handling.
   *
   * @param streamAdvisorChain advisor chain to invoke
   * @param originalRequest original chat request
   * @param optionsCopy tool calling options with internal execution disabled
   * @param instructions current instruction list
   * @returns an observable of chat client responses
   */
  private internalStream(
    streamAdvisorChain: StreamAdvisorChain,
    originalRequest: ChatClientRequest,
    optionsCopy: ToolCallingChatOptions,
    instructions: Message[],
  ): Observable<ChatClientResponse> {
    return defer(() => {
      // Build request with current instructions
      const processedRequest = ChatClientRequest.builder()
        .prompt(new Prompt(instructions, optionsCopy))
        .context(originalRequest.context)
        .build();

      return from(
        this.doBeforeStream(processedRequest, streamAdvisorChain),
      ).pipe(
        mergeMap((beforeRequest) => {
          // Get a copy of the chain excluding this advisor
          const chainCopy = streamAdvisorChain.copy(this);

          const aggregatedResponseRef: {
            value: ChatClientResponse | null;
          } = { value: null };

          // Get the streaming response
          const responseFlux = chainCopy.nextStream(beforeRequest);

          const streamingBranch =
            new ChatClientMessageAggregator().aggregateChatClientResponse(
              responseFlux,
              (aggregatedResponse) => {
                aggregatedResponseRef.value = aggregatedResponse;
              },
            );

          return streamingBranch.pipe(
            concatWith(
              defer(() =>
                this.handleToolCallRecursion(
                  aggregatedResponseRef.value,
                  beforeRequest,
                  streamAdvisorChain,
                  originalRequest,
                  optionsCopy,
                ),
              ),
            ),
            filter(
              (chatClientResponse) =>
                this._streamToolCallResponses ||
                !(chatClientResponse.chatResponse?.hasToolCalls() ?? false),
            ),
          );
        }),
      );
    });
  }

  /**
   * Handles tool call detection and recursion after streaming completes.
   *
   * @param aggregatedResponse aggregated streaming response
   * @param finalRequest final request used for tool execution
   * @param streamAdvisorChain advisor chain to invoke
   * @param originalRequest original chat request
   * @param optionsCopy tool calling options with internal execution disabled
   * @returns an observable of chat client responses
   */
  private handleToolCallRecursion(
    aggregatedResponse: ChatClientResponse | null,
    finalRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
    originalRequest: ChatClientRequest,
    optionsCopy: ToolCallingChatOptions,
  ): Observable<ChatClientResponse> {
    if (aggregatedResponse == null) {
      return this.doFinalizeLoopStream(EMPTY, streamAdvisorChain);
    }

    return from(
      this.doAfterStream(aggregatedResponse, streamAdvisorChain),
    ).pipe(
      mergeMap((afterResponse) => {
        const chatResponse = afterResponse.chatResponse;
        const isToolCall = chatResponse?.hasToolCalls() === true;

        if (!isToolCall) {
          // No tool call - streaming already happened, nothing more to emit.
          return this.doFinalizeLoopStream(EMPTY, streamAdvisorChain);
        }

        assert(
          chatResponse,
          "redundant check that should never fail, but here to help nullability checks",
        );

        // Execute tool calls and continue the loop if the response is not direct.
        return from(
          this._toolCallingManager.executeToolCalls(
            finalRequest.prompt,
            chatResponse,
          ),
        ).pipe(
          mergeMap((toolExecutionResult) => {
            if (toolExecutionResult.returnDirect()) {
              // Return tool execution result directly to the application client.
              return of(
                afterResponse
                  .mutate()
                  .chatResponse(
                    ChatResponse.builder()
                      .from(chatResponse)
                      .generations(
                        ToolExecutionResult.buildGenerations(
                          toolExecutionResult,
                        ),
                      )
                      .build(),
                  )
                  .build(),
              );
            }

            // Recursive call with updated conversation history.
            const nextInstructions =
              this.doGetNextInstructionsForToolCallStream(
                finalRequest,
                afterResponse,
                toolExecutionResult,
              );

            return this.internalStream(
              streamAdvisorChain,
              originalRequest,
              optionsCopy,
              nextInstructions,
            );
          }),
        );
      }),
    );
  }
}
