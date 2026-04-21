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
import type { ChatClient } from "@nestjs-ai/client-chat";
import type { Message } from "@nestjs-ai/model";
import { MessageType, PromptTemplate } from "@nestjs-ai/model";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-port/core";
import type { Query } from "../../../query";
import { PromptAssert } from "../../../util";
import { QueryTransformer } from "./query-transformer";

export interface CompressionQueryTransformerProps {
  chatClientBuilder: ChatClient.Builder;
  promptTemplate?: PromptTemplate | null;
}

/**
 * Uses a large language model to compress a conversation history and a follow-up query
 * into a standalone query that captures the essence of the conversation.
 *
 * This transformer is useful when the conversation history is long and the follow-up
 * query is related to the conversation context.
 */
export class CompressionQueryTransformer extends QueryTransformer {
  private readonly logger: Logger = LoggerFactory.getLogger(
    CompressionQueryTransformer.name,
  );

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
    `Given the following conversation history and a follow-up query, your task is to synthesize
a concise, standalone query that incorporates the context from the history.
Ensure the standalone query is clear, specific, and maintains the user's intent.

Conversation history:
{history}

Follow-up query:
{query}

Standalone query:`,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  constructor(props: CompressionQueryTransformerProps) {
    super();
    assert(props.chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = props.chatClientBuilder.build();
    this.promptTemplate =
      props.promptTemplate ??
      CompressionQueryTransformer.DEFAULT_PROMPT_TEMPLATE;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "history",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    this.logger.debug(
      "Compressing conversation history and follow-up query into a standalone query",
    );

    const compressedQueryText = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("history", this.formatConversationHistory(query.history))
          .param("query", query.text),
      )
      .call()
      .content();

    if (!StringUtils.hasText(compressedQueryText)) {
      this.logger.warn(
        "Query compression result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(compressedQueryText).build();
  }

  private formatConversationHistory(history: Message[]): string {
    if (history.length === 0) {
      return "";
    }

    return history
      .filter(
        (message) =>
          message.messageType === MessageType.USER ||
          message.messageType === MessageType.ASSISTANT,
      )
      .map((message) => `${message.messageType}: ${message.text}`)
      .join("\n");
  }
}
