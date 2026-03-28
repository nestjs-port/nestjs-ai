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
import { EOL } from "node:os";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import {
  ChatMemory,
  type Message,
  MessageType,
  PromptTemplate,
} from "@nestjs-ai/model";
import type { Observable, SchedulerLike } from "rxjs";
import { mergeMap, observeOn, of } from "rxjs";

import { ChatClientMessageAggregator } from "../chat-client-message-aggregator";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type { AdvisorChain, StreamAdvisorChain } from "./api";
import { Advisor, BaseAdvisor, BaseChatMemoryAdvisor } from "./api";

export interface PromptChatMemoryAdvisorProps {
  chatMemory: ChatMemory;
  conversationId?: string;
  order?: number;
  scheduler?: SchedulerLike;
  systemPromptTemplate?: PromptTemplate;
}

export class PromptChatMemoryAdvisor extends BaseChatMemoryAdvisor {
  private static readonly DEFAULT_SYSTEM_PROMPT_TEMPLATE = new PromptTemplate(`
{instructions}

Use the conversation memory from the MEMORY section to provide accurate answers.

---------------------
MEMORY:
{memory}
---------------------

`);

  private readonly _logger: Logger = LoggerFactory.getLogger(
    PromptChatMemoryAdvisor.name,
  );

  private readonly _chatMemory: ChatMemory;
  private readonly _defaultConversationId: string;
  private readonly _order: number;
  private readonly _scheduler: SchedulerLike;
  private readonly _systemPromptTemplate: PromptTemplate;

  constructor({
    chatMemory,
    conversationId = ChatMemory.DEFAULT_CONVERSATION_ID,
    order = Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER,
    scheduler = BaseAdvisor.DEFAULT_SCHEDULER,
    systemPromptTemplate = PromptChatMemoryAdvisor.DEFAULT_SYSTEM_PROMPT_TEMPLATE,
  }: PromptChatMemoryAdvisorProps) {
    super();
    assert(chatMemory != null, "chatMemory cannot be null");
    assert(
      StringUtils.hasText(conversationId),
      "defaultConversationId cannot be null or empty",
    );
    assert(scheduler != null, "scheduler cannot be null");
    assert(systemPromptTemplate != null, "systemPromptTemplate cannot be null");

    this._chatMemory = chatMemory;
    this._defaultConversationId = conversationId;
    this._order = order;
    this._scheduler = scheduler;
    this._systemPromptTemplate = systemPromptTemplate;
  }

  override get order(): number {
    return this._order;
  }

  override get scheduler(): SchedulerLike {
    return this._scheduler;
  }

  override async before(
    chatClientRequest: ChatClientRequest,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientRequest> {
    const conversationId = this.getConversationId(
      chatClientRequest.context,
      this._defaultConversationId,
    );

    const memoryMessages = await this._chatMemory.get(conversationId);
    this._logger.debug(
      "[PromptChatMemoryAdvisor.before] Memory before processing for conversationId={}: {}",
      conversationId,
      memoryMessages,
    );

    const memory = memoryMessages
      .filter(
        (message: Message) =>
          message.messageType === MessageType.USER ||
          message.messageType === MessageType.ASSISTANT,
      )
      .map((message: Message) => `${message.messageType}:${message.text ?? ""}`)
      .join(EOL);

    const augmentedSystemText = this._systemPromptTemplate.render({
      instructions: chatClientRequest.prompt.systemMessage.text ?? "",
      memory,
    });

    const processedChatClientRequest = chatClientRequest
      .mutate()
      .prompt(
        chatClientRequest.prompt.augmentSystemMessage(augmentedSystemText),
      )
      .build();

    const userMessage =
      processedChatClientRequest.prompt.lastUserOrToolResponseMessage;
    await this._chatMemory.add(conversationId, userMessage);

    return processedChatClientRequest;
  }

  override async after(
    chatClientResponse: ChatClientResponse,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientResponse> {
    const assistantMessages: Message[] =
      chatClientResponse.chatResponse?.results.map(
        (generation) => generation.output,
      ) ?? [];

    if (assistantMessages.length > 0) {
      const conversationId = this.getConversationId(
        chatClientResponse.context,
        this._defaultConversationId,
      );

      await this._chatMemory.add(conversationId, assistantMessages);

      if (this._logger.isDebugEnabled()) {
        this._logger.debug(
          "[PromptChatMemoryAdvisor.after] Added ASSISTANT messages to memory for conversationId={}: {}",
          conversationId,
          assistantMessages,
        );
        const memoryMessages = await this._chatMemory.get(conversationId);
        this._logger.debug(
          "[PromptChatMemoryAdvisor.after] Memory after ASSISTANT add for conversationId={}: {}",
          conversationId,
          memoryMessages,
        );
      }
    }

    return chatClientResponse;
  }

  override adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    const scheduler = this.scheduler;
    const chatClientResponses = of(chatClientRequest).pipe(
      observeOn(scheduler),
      mergeMap((request) => this.before(request, streamAdvisorChain)),
      mergeMap((request) => streamAdvisorChain.nextStream(request)),
    );

    return new ChatClientMessageAggregator().aggregateChatClientResponse(
      chatClientResponses,
      (response) => {
        void this.after(response, streamAdvisorChain);
      },
    );
  }
}
