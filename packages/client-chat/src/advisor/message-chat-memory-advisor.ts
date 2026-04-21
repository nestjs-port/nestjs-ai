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
import type { Message } from "@nestjs-ai/model";
import { ChatMemory, SystemMessage } from "@nestjs-ai/model";
import { StringUtils } from "@nestjs-port/core";
import type { Observable, SchedulerLike } from "rxjs";
import { mergeMap, observeOn, of } from "rxjs";

import { ChatClientMessageAggregator } from "../chat-client-message-aggregator";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type { AdvisorChain, StreamAdvisorChain } from "./api";
import { Advisor, BaseAdvisor, BaseChatMemoryAdvisor } from "./api";

export interface MessageChatMemoryAdvisorProps {
  chatMemory: ChatMemory;
  conversationId?: string;
  order?: number;
  scheduler?: SchedulerLike;
}

export class MessageChatMemoryAdvisor extends BaseChatMemoryAdvisor {
  private readonly _chatMemory: ChatMemory;
  private readonly _defaultConversationId: string;
  private readonly _order: number;
  private readonly _scheduler: SchedulerLike;

  constructor({
    chatMemory,
    conversationId = ChatMemory.DEFAULT_CONVERSATION_ID,
    order = Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER,
    scheduler = BaseAdvisor.DEFAULT_SCHEDULER,
  }: MessageChatMemoryAdvisorProps) {
    super();
    assert(chatMemory != null, "chatMemory cannot be null");
    assert(
      StringUtils.hasText(conversationId),
      "defaultConversationId cannot be null or empty",
    );
    assert(scheduler != null, "scheduler cannot be null");

    this._chatMemory = chatMemory;
    this._defaultConversationId = conversationId;
    this._order = order;
    this._scheduler = scheduler;
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
    const processedMessages = [
      ...memoryMessages,
      ...chatClientRequest.prompt.instructions,
    ];

    for (let i = 0; i < processedMessages.length; i++) {
      if (processedMessages[i] instanceof SystemMessage) {
        const [systemMessage] = processedMessages.splice(i, 1);
        if (systemMessage != null) {
          processedMessages.unshift(systemMessage);
        }
        break;
      }
    }

    const processedChatClientRequest = chatClientRequest
      .mutate()
      .prompt(
        chatClientRequest.prompt.mutate().messages(processedMessages).build(),
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
    let assistantMessages: Message[] = [];
    if (chatClientResponse.chatResponse != null) {
      assistantMessages = chatClientResponse.chatResponse.results.map(
        (generation) => generation.output,
      );
    }

    await this._chatMemory.add(
      this.getConversationId(
        chatClientResponse.context,
        this._defaultConversationId,
      ),
      assistantMessages,
    );

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
