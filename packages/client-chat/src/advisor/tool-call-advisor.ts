import assert from "node:assert/strict";
import { HIGHEST_PRECEDENCE, LOWEST_PRECEDENCE } from "@nestjs-ai/commons";
import {
  ChatResponse,
  type Message,
  Prompt,
  type ToolCallingChatOptions,
  ToolCallingManager,
  ToolExecutionResult,
} from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { throwError } from "rxjs";

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
}

function isToolCallingChatOptions(
  options: unknown,
): options is ToolCallingChatOptions {
  return (
    options != null &&
    typeof options === "object" &&
    "internalToolExecutionEnabled" in options
  );
}

export class ToolCallAdvisor implements CallAdvisor, StreamAdvisor {
  static readonly DEFAULT_ADVISOR_ORDER = HIGHEST_PRECEDENCE + 300;

  protected readonly _toolCallingManager: ToolCallingManager;
  private readonly _advisorOrder: number;
  private readonly _conversationHistoryEnabled: boolean;

  constructor(props: ToolCallAdvisorProps = {}) {
    const toolCallingManager =
      props.toolCallingManager === undefined
        ? ToolCallingManager.builder()
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
  }

  get name(): string {
    return "Tool Calling Advisor";
  }

  get order(): number {
    return this._advisorOrder;
  }

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

    const initializedChatClientRequest = await this.initializeLoop(
      chatClientRequest,
      callAdvisorChain,
    );

    // Overwrite the ToolCallingChatOptions to disable internal tool execution.
    const optionsCopy = initializedChatClientRequest.prompt.options?.copy();
    if (optionsCopy == null || !isToolCallingChatOptions(optionsCopy)) {
      throw new TypeError(
        "ToolCall Advisor requires ToolCallingChatOptions to be set in the ChatClientRequest options.",
      );
    }

    // Disable internal tool execution to allow ToolCallAdvisor to handle tool calls.
    optionsCopy.internalToolExecutionEnabled = false;

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
      processedChatClientRequest = await this.beforeCall(
        processedChatClientRequest,
        callAdvisorChain,
      );

      chatClientResponse = await callAdvisorChain
        .copy(this)
        .nextCall(processedChatClientRequest);

      chatClientResponse = await this.afterCall(
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

        const toolExecutionResult = this._toolCallingManager.executeToolCalls(
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

        instructions = this.getNextInstructionsForToolCall(
          processedChatClientRequest,
          chatClientResponse,
          toolExecutionResult,
        );
      }
    } while (isToolCall); // loop until no tool calls are present

    assert(chatClientResponse != null, "chatClientResponse must not be null");
    return await this.finalizeLoop(chatClientResponse, callAdvisorChain);
  }

  protected getNextInstructionsForToolCall(
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

  protected async finalizeLoop(
    chatClientResponse: ChatClientResponse,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    return chatClientResponse;
  }

  protected async initializeLoop(
    chatClientRequest: ChatClientRequest,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  protected async beforeCall(
    chatClientRequest: ChatClientRequest,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    return chatClientRequest;
  }

  protected async afterCall(
    chatClientResponse: ChatClientResponse,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    return chatClientResponse;
  }

  adviseStream(
    _chatClientRequest: ChatClientRequest,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    return throwError(() => new Error("Unimplemented method 'adviseStream'"));
  }
}
