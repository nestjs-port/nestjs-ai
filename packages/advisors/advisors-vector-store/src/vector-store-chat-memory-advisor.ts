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
import {
  Advisor,
  type AdvisorChain,
  BaseAdvisor,
  BaseChatMemoryAdvisor,
  ChatClientMessageAggregator,
  type ChatClientRequest,
  type ChatClientResponse,
  type StreamAdvisorChain,
} from "@nestjs-ai/client-chat";
import { Document } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ChatMemory,
  type Message,
  MessageType,
  PromptTemplate,
} from "@nestjs-ai/model";
import { SearchRequest, type VectorStore } from "@nestjs-ai/vector-store";
import type { Observable, SchedulerLike } from "rxjs";
import { mergeMap, observeOn, of } from "rxjs";

export interface VectorStoreChatMemoryAdvisorProps {
  vectorStore: VectorStore;
  systemPromptTemplate?: PromptTemplate;
  defaultTopK?: number;
  conversationId?: string;
  order?: number;
  scheduler?: SchedulerLike;
}

export class VectorStoreChatMemoryAdvisor extends BaseChatMemoryAdvisor {
  static readonly TOP_K = "chat_memory_vector_store_top_k";

  private static readonly DOCUMENT_METADATA_CONVERSATION_ID = "conversationId";

  private static readonly DOCUMENT_METADATA_MESSAGE_TYPE = "messageType";

  static readonly DEFAULT_TOP_K = 20;

  static readonly DEFAULT_SYSTEM_PROMPT_TEMPLATE = new PromptTemplate(`
{instructions}

Use the long term conversation memory from the LONG_TERM_MEMORY section to provide accurate answers.

---------------------
LONG_TERM_MEMORY:
{long_term_memory}
---------------------
`);

  private readonly _systemPromptTemplate: PromptTemplate;
  private readonly _defaultTopK: number;
  private readonly _defaultConversationId: string;
  private readonly _order: number;
  private readonly _scheduler: SchedulerLike;
  private readonly _vectorStore: VectorStore;

  constructor({
    vectorStore,
    systemPromptTemplate = VectorStoreChatMemoryAdvisor.DEFAULT_SYSTEM_PROMPT_TEMPLATE,
    defaultTopK = VectorStoreChatMemoryAdvisor.DEFAULT_TOP_K,
    conversationId = ChatMemory.DEFAULT_CONVERSATION_ID,
    order = Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER,
    scheduler = BaseAdvisor.DEFAULT_SCHEDULER,
  }: VectorStoreChatMemoryAdvisorProps) {
    super();
    assert(systemPromptTemplate != null, "systemPromptTemplate cannot be null");
    assert(defaultTopK > 0, "topK must be greater than 0");
    assert(
      conversationId != null && conversationId.trim().length > 0,
      "defaultConversationId cannot be null or empty",
    );
    assert(scheduler != null, "scheduler cannot be null");
    assert(vectorStore != null, "vectorStore cannot be null");

    this._systemPromptTemplate = systemPromptTemplate;
    this._defaultTopK = defaultTopK;
    this._defaultConversationId = conversationId;
    this._order = order;
    this._scheduler = scheduler;
    this._vectorStore = vectorStore;
  }

  static builder(
    vectorStore: VectorStore,
  ): VectorStoreChatMemoryAdvisor.Builder {
    return new VectorStoreChatMemoryAdvisor.Builder(vectorStore);
  }

  override get order(): number {
    return this._order;
  }

  override get scheduler(): SchedulerLike {
    return this._scheduler;
  }

  override async before(
    request: ChatClientRequest,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientRequest> {
    const conversationId = this.getConversationId(
      request.context,
      this._defaultConversationId,
    );
    const query = request.prompt.userMessage.text ?? "";
    const topK = this.getChatMemoryTopK(request.context);
    const filter = `${VectorStoreChatMemoryAdvisor.DOCUMENT_METADATA_CONVERSATION_ID}=='${conversationId}'`;

    const searchRequest = SearchRequest.builder()
      .query(query)
      .topK(topK)
      .filterExpression(filter)
      .build();

    const documents = await this._vectorStore.similaritySearch(searchRequest);

    const longTermMemory = documents
      .map((document) => document.text ?? "")
      .join(EOL);

    const systemMessage = request.prompt.systemMessage;
    const augmentedSystemText = this._systemPromptTemplate.render({
      instructions: systemMessage.text,
      long_term_memory: longTermMemory,
    });

    const processedChatClientRequest = request
      .mutate()
      .prompt(request.prompt.augmentSystemMessage(augmentedSystemText))
      .build();

    const userMessages = processedChatClientRequest.prompt.userMessages;
    const userMessage = userMessages[userMessages.length - 1];
    if (userMessage != null) {
      await this._vectorStore.write(
        this.toDocuments([userMessage], conversationId),
      );
    }

    return processedChatClientRequest;
  }

  private getChatMemoryTopK(context: Map<string, unknown>): number {
    const fromContext = context.get(VectorStoreChatMemoryAdvisor.TOP_K);
    if (fromContext != null) {
      return Number.parseInt(String(fromContext), 10);
    }
    return this._defaultTopK;
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

    await this._vectorStore.write(
      this.toDocuments(
        assistantMessages,
        this.getConversationId(
          chatClientResponse.context,
          this._defaultConversationId,
        ),
      ),
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

  private toDocuments(messages: Message[], conversationId: string): Document[] {
    return messages
      .filter(
        (message) =>
          message.messageType === MessageType.USER ||
          message.messageType === MessageType.ASSISTANT,
      )
      .map((message) => {
        const metadata: Record<string, unknown> = {
          ...message.metadata,
          [VectorStoreChatMemoryAdvisor.DOCUMENT_METADATA_CONVERSATION_ID]:
            conversationId,
          [VectorStoreChatMemoryAdvisor.DOCUMENT_METADATA_MESSAGE_TYPE]:
            message.messageType,
        };

        if (message.messageType === MessageType.USER) {
          return (
            Document.builder()
              .text(message.text)
              // userMessage.getMedia().get(0).getId()
              // TODO vector store for memory would not store this into the
              // vector store, could store an 'id' instead
              // .media(userMessage.getMedia())
              .metadata(metadata)
              .build()
          );
        }

        if (message instanceof AssistantMessage) {
          return Document.builder()
            .text(message.text)
            .metadata(metadata)
            .build();
        }

        throw new Error(`Unknown message type: ${message.messageType}`);
      });
  }
}

export namespace VectorStoreChatMemoryAdvisor {
  export class Builder {
    private readonly _vectorStore: VectorStore;
    private _systemPromptTemplate =
      VectorStoreChatMemoryAdvisor.DEFAULT_SYSTEM_PROMPT_TEMPLATE;
    private _defaultTopK = VectorStoreChatMemoryAdvisor.DEFAULT_TOP_K;
    private _conversationId = ChatMemory.DEFAULT_CONVERSATION_ID;
    private _scheduler = BaseAdvisor.DEFAULT_SCHEDULER;
    private _order = Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER;

    constructor(vectorStore: VectorStore) {
      this._vectorStore = vectorStore;
    }

    systemPromptTemplate(systemPromptTemplate: PromptTemplate): this {
      this._systemPromptTemplate = systemPromptTemplate;
      return this;
    }

    defaultTopK(defaultTopK: number): this {
      this._defaultTopK = defaultTopK;
      return this;
    }

    conversationId(conversationId: string): this {
      this._conversationId = conversationId;
      return this;
    }

    scheduler(scheduler: SchedulerLike): this {
      this._scheduler = scheduler;
      return this;
    }

    order(order: number): this {
      this._order = order;
      return this;
    }

    build(): VectorStoreChatMemoryAdvisor {
      return new VectorStoreChatMemoryAdvisor({
        vectorStore: this._vectorStore,
        systemPromptTemplate: this._systemPromptTemplate,
        defaultTopK: this._defaultTopK,
        conversationId: this._conversationId,
        order: this._order,
        scheduler: this._scheduler,
      });
    }
  }
}
